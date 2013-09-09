var backgroundPage = chrome.extension.getBackgroundPage();

{
	if(backgroundPage)
	{
		//alert('Page found');
		/*var langCombo = document.getElementById('selectedLanguage');
		langCombo.innerText = "Ameya ";
		var caret = document.createElement('span');
		caret.setAttribute('class','caret');
		langCombo.appendChild(caret);*/
	}
}

 $(function(){

    $(".dropdown-menu li a").click(function(){

    	$(this).parent().parent().parent().children()[0].text($(this).text());
    	$(this).parent().parent().parent().children()[0].val($(this).text());
      //$(".btn:first-child").text($(this).text());
      //$(".btn:first-child").val($(this).text());

   });

});