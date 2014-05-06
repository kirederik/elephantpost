$(document).ready(function() {
  $(".pulse").tooltip();
  $('a.navitem').click(function() {
    var elementClicked = $(this).attr("href");
    var destination = $(elementClicked).offset().top;
    $('html,body').animate({scrollTop: $(elementClicked).offset().top - 81},'slow');
    return false;
  });
});