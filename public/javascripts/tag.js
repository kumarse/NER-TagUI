$(function () {
  
  // Constants
  var PARA_DELIMITER = '\n',
      TOKEN_DELIMITER = ' ';
  
  // Globals
  var annotations = [],
      sourceTokens = [],
      parasTokens = [];
  
  var punctuations = [".", "?", "!", ":", ";", "-", "—", "(", ")", "[", "]", "’", '"', "/", ","];
  
  var stripPunctuations = function stripPunctuations(str) {
      str = str.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"\[\]?]/g,"");
      return str.trim();
  }

  var parseText = function parseText(sourceText) {
    var paras = sourceText.split(PARA_DELIMITER);
    return paras.map(function(p) { return p.split(TOKEN_DELIMITER); });
  }
  
  var getAnnotationInfo = function getAnnotationInfo(startToken) {
    var arr = annotations.filter(function(ann) {
      if(ann.start == startToken.start) {
        return ann;
      }
    });
    return arr.length > 0 ? arr[0] : undefined;
  }
  
  /*
   * Generate spans by enriching the source text with the annotations information 
   */
  var generateSpans = function generateSpans(parasTokens) {
    var tokenNo = 0, spanId = 0;
    var parasTokensSpans = [];
    
    // For each paragraph
    for(var i=0; i<parasTokens.length; i++) {
      var pTokens = parasTokens[i];
      
      var pTokensSpans = [];
      
      // For each token(s)
      for(var j=0; j < pTokens.length; j++) {
        var token = pTokens[j];
        var numTokens = 1;
        var cls = "token";
        var annotationInfo = getAnnotationInfo({token: token, start: tokenNo}, annotations);
        if(annotationInfo) {
          // Add as many tokens as in annotationInfo into this span
          for(var k=1; k < annotationInfo.length; k++) {
            token += " " + pTokens[j + k];
          }
          cls += " ne " + annotationInfo.cls;
          // Adjust j accordingly
          j += k-1;
          numTokens += k-1;
        }
        pTokensSpans.push("<span id = " + spanId + " data-token-start=" + tokenNo + " data-token-length=" + numTokens + " class='" + cls + "'>" + token + " </span>");
        ++spanId
        // Adjust token cursor
        tokenNo += numTokens;
      }
      parasTokensSpans.push(pTokensSpans);
    }
    return parasTokensSpans;
  }
  
  var isAlreadyPartOfAnnotation = function isAlreadyPartOfAnnotation(annotationInfo) {
    var curStart = annotationInfo.start, curEnd = annotationInfo.start + annotationInfo.length;
    for(var i=0; i < annotations.length; i++) {
      var ann = annotations[i];
      var existingStart = ann.start, existingEnd = ann.start + ann.length;
      if( curStart < existingEnd && curEnd > existingStart) {
        return true;
      }
    }
  }
  
  var annotateInflections =  function annotateInflections(namedEntity, cls) {
    // Remove punctuations
    namedEntity = stripPunctuations(namedEntity)
    var inflections = generateInflections(namedEntity);
    inflections.push(namedEntity);
    
    windowSize = namedEntity.split(" ").length;
    
    for(var i=0; i <= sourceTokens.length - windowSize; i++) {
      var windowString = sourceTokens.slice(i, i + windowSize).join(" ");
      // Remove punctuations from the comparison target
      windowString = stripPunctuations(windowString);
      if(windowString.trim() && inflections.indexOf(windowString) != -1) {
        // Check if already a part of annotation
        if(isAlreadyPartOfAnnotation({start: i, length: windowSize, token: windowString})) {
          continue;
        }
        else {
          annotations.push({start: i, length: windowSize, token: windowString, cls: cls});
        }
      }
    }
  }
  
  
  var getSelectionInfo = function getSelectionInfo(selection, event) {
    var selectedText = selection.toString();
    var anchor$ = $(selection.anchorNode.parentNode),
        anchorText = anchor$.text();
        
    var selectedTextTokens = selectedText.trimRight().split(" ");
    var lastToken = selectedTextTokens[selectedTextTokens.length-1];
    var firstToken = selectedTextTokens[0];
    var anchorIndex;

    if(anchorText.trim().startsWith(lastToken)) {
      anchorIndex = selectedTextTokens.length-1;
    }
    else if(anchorText.trim().endsWith(firstToken) || anchorText.indexOf(firstToken)) {
      anchorIndex = 0;
    }
    
    if(anchorIndex === undefined) {
      alert("Sorry, couldn't process this selection. Please select again");
      return;
    }
    
    var tokenStart = anchor$.data("token-start") - anchorIndex;
    if(selectedText.startsWith(" ")) {
      // Advance token to next word because the space will be from the end of the previous token
      ++tokenStart;
      selectedTextTokens.splice(0, 1);
    }
    
    if(isAlreadyPartOfAnnotation({start: tokenStart, length: selectedTextTokens.length})) {
      alert("Your selection overlaps an already tagged entity. Please change selection");
      return;
    }
    
    var selectedToken = ""
    for(var i=tokenStart; i < tokenStart + selectedTextTokens.length; i++) {
      selectedToken += $("[data-token-start=" + i + "]").html();
    }

    return {
      token: selectedToken,
      start: tokenStart, 
      length: selectedTextTokens.length,
      cls: ""
    }
  }
  
  // Global to store the text selection info
  var selectionInfo;
  
  var onMouseUp = function onMouseUp(event) {
    /*if($("#ner-dialog").is(":visible") || $("#selected-ner-menu").is(":visible") || $(event.target).hasClass("ne") || $("#open-dialog").is(":visible")) {
      return;
    }*/
    if(!$(event.target).closest("#source").size()) {
      return;
    }
    var selected = window.getSelection();
    var selectedText = selected.toString();   
    
    if(selectedText.trim()) {
      selectionInfo = getSelectionInfo(selected, event);
      if(selectionInfo) {
        $("#ner-dialog #selected-text").html(selectionInfo.token);
        $("input[name='nerchoice']").prop("checked", false);
        $("#ner-dialog").dialog("open");
      }
    }
  };
  $(document).on("mouseup", onMouseUp);
  
  // Setup dialog
  $("#ner-dialog").dialog({
    autoOpen: false,
    modal: true,
    title: 'Choose type for Named Entity',
    width: '500px',
    buttons: [{
      text: "Ok",
      click: function() {
        $( this ).dialog( "close" );
        var selectedValue = $("[name=nerchoice]:checked").val();
        if(selectedValue) {
          selectionInfo.cls = {"1": "person", "2": "location", "3": "group", "4": "time", "5": "role", "6": "event"}[selectedValue];
          onNerSelection(selectionInfo);
        }
      }
    }, {
      text: "Cancel",
      click: function() {
        $( this ).dialog( "close" );
      }
    }]
  });
  
  var onNerSelection = function onNerSelection(selectedNamedEntityInfo) {
    annotations.push({
      start: selectedNamedEntityInfo.start,
      length: selectedNamedEntityInfo.length,
      token: selectedNamedEntityInfo.token,
      cls: selectedNamedEntityInfo.cls});
    
    annotateInflections(selectedNamedEntityInfo.token, selectedNamedEntityInfo.cls);
    
    // Rerender the text
    generateHtml();
  }
  
  // Menu handling code
  var menu$ = $("#selected-ner-menu");
  menu$.menu().hide();
  var curSelectedNamedEntity$;
  
  var selectedEntityChangeHandler = function selectedEntityChangeHandler(ele) {
    curSelectedNamedEntity$ = $(this);
    menu$.show().position({
      my: "left top"
      , at: "left bottom"
      , of: curSelectedNamedEntity$
    });
    return false;
  };

  menu$.on("click", "li", function (event) {
    var tokenStart = curSelectedNamedEntity$.data("token-start");
    var token = curSelectedNamedEntity$.text();
    var length =  curSelectedNamedEntity$.data("token-length");
    var cls = curSelectedNamedEntity$[0].classList[2];
    
    var curSelectedCls = $(this).html().toLowerCase();
    if(cls !== curSelectedCls) {
      curSelectedNamedEntity$.removeClass(cls);
      
      var spliceIndex = -1;
      for(var i=0; i<annotations.length; i++) {
        if(annotations[i].start == tokenStart) {
          spliceIndex = i;
          break;
        }
      }
      if(spliceIndex != -1) {
        annotations.splice(spliceIndex, 1);
      }
      
      if(curSelectedCls != 'none') {
        annotations.push({
          start: tokenStart,
          length: length,
          token: token,
          cls: curSelectedCls
        });
      }
      
      generateHtml();
    }
    
    menu$.hide();
  });


  $("body").on("click", function () {
    menu$.hide();
  });
  
  
  var generateHtml = function generateHtml() {
    // Generate text spans for all paras
    parasTokensSpan = generateSpans(parasTokens, annotations);
    
    // Generate HTML for all paras
    parasTokensHtml = parasTokensSpan.map(function(pTokens) { return pTokens.join(""); });
    
    // TODO: Modify this to generate <P> for each paragraph
    
    $("#source").html(parasTokensHtml.map(function(pContent, index) { return "<p id=" + index + ">" + pContent + "</p>"; }).join(" "));
    
    // Setup handlers for already selected entities
    $(".ne").on("click", selectedEntityChangeHandler); 
    // Setup document mouseup handler - here or global ?
  }
  
  var handleSourceLoad = function handleSourceLoad(text, annJson) {
    parasTokens = parseText(text);
    
    // Empty Source Tokens
    sourceTokens = [];
    // Fill Source Tokens
    parasTokens.forEach(function(pTokens) {
      Array.prototype.push.apply(sourceTokens, pTokens);
    });
    
    // Set annotations
    annotations = JSON.parse(annJson);
    /*
    // Tag known named entities contained within this text
    knownNamedEntities.forEach(function(namedEntity) {      
      annotateInflections(namedEntity.token, namedEntity.cls);
    });
    */
    
    generateHtml();
  };
  
  var populateFilenames = function populateFilenames(filelist) {
    var liHtml = "";
    filelist.forEach(function(file) {
      liHtml += "<li value='" + file + "'>" + file + "</li>";
    });
    $("ul#filelist").html(liHtml);
  };
  
  var curFilename;
  
  // Setup Open dialog
  $("#open-dialog").dialog({
    autoOpen: false,
    modal: true,
    title: 'Choose file',
    width: '800px',
    buttons: [{
      text: "Ok",
      click: function() {
        $( this ).dialog( "close" );
        var filename = $("ul#filelist li.active").html();
        $("ul#filelist li.active").removeClass("active");
        if(filename) {
          curFilename = filename.replace(/\.txt$/, "");
          onFileSelection(curFilename);
        }
      }
    }, {
      text: "Cancel",
      click: function() {
        $( this ).dialog( "close" );
      }
    }]
  });
  
  
  $("#open-btn").attr("disabled", true);
  $("#save-btn").attr("disabled", true);
  
  $.get("/list", function(json) {
    data = JSON.parse(json.data);
    populateFilenames(data);
    $("#open-btn").attr("disabled", false);
  });
  
  $("#open-btn").on("click", function(event) {
     $("#open-dialog").dialog("open");
  });
  
  $("ul#filelist").on("click", "li", function(event) {
    $("ul#filelist li.active").removeClass("active");
    $(this).addClass("active");
  });

  $("#save-btn").on("click", function(event) {
     $(this).attr("disabled", true);
     $("#status").html("Saving");
     $("#source").html("");
    
     $.post("/save", {name: curFilename, data: JSON.stringify(annotations)}).done(function() {
       alert("Changes saved successfully");
       $("#status").html("");
     }).fail(function() {
       alert("Couldn't save changes");
       $("#status").html("");
       $("#save-btn").attr("disabled", false);
       generateHtml();
     });
  });
  
  
  var onFileSelection = function onFileSelection(filename) {
    var fileGet = $.get("/data/raw/" + filename + ".txt", function(fileData) {
      $.get("/data/ann/" + filename + ".json").done(function(annJson) {
        handleSourceLoad(fileData, annJson);
      }).fail(function() {
        handleSourceLoad(fileData, []);
      });
      $("#save-btn").attr("disabled", false);
    });
  }
});


