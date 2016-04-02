$(function () {
  var source$ = $("#source");
  var sourceText = source$.html();
  var tokens = sourceText.split(" ");
  var enrichedTokens = tokens.map(function (token) {
    return "<span class='token'>" + token + "</span>";
  });
  var enrichedHtml = enrichedTokens.join(" ");

  source$.html(enrichedHtml);

  var inflations = {
    "சென்னை": 1
    , "சென்னையை": 1
    , "சென்னைக்கு": 1
    , "சென்னையின்": 1
    , "சென்னையிலிருந்து": 1
    , "சென்னையோடு": 1
    , "சென்னையில்": 1
    , "சென்னையுடைய": 1
    , "சென்னையால்": 1
  }

  var menu$ = $("#menu");
  menu$.menu().hide();

  var curElement;

  source$.on("click", ".token", function () {
    curElement = this;
    $("#menu").show().position({
      my: "left top"
      , at: "left bottom"
      , of: curElement
    });
    return false;
  });

  menu$.on("click", "li", function () {
    var type = $(this).html().toLowerCase();
    $(curElement).removeClass("person location organization");
    if (type != "none") {
      $(curElement).addClass(type);
      $("span.token").each(function (index, element) {
        if ($(element).html() in inflations) {
          $(element).addClass(type);
        }
      });
    }
    menu$.hide();
  });

  $("body").on("click", ":not(.token)", function () {
    menu$.hide();
  });
});