/*
 * Ameya Zambre
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	defaultLang = localStorage.getItem("defaultLanguage"), /*Should go into local storage*/
	timeVal = localStorage.getItem('refreshTimeVal'), 
	timeUnit = localStorage.getItem('refreshTimeUnit');

{
	if(backgroundPage)
	{
		var listHtml = "";
		for(i=0; i<backgroundPage.languages.length; i++)
		{
			listHtml = listHtml + "<li><a href=#>"+backgroundPage.languages[i]+"</a></li>";
		}
		$("#languageList").html(listHtml);
		$("#selectedLanguage").html(defaultLang+" <span class=\"caret\"></span>");
		$("#timeValue").val(timeVal);
		$("#selectedTimeUnit").html(timeUnit+" <span class=\"caret\"></span>");	
		$("#lastUpdated").text(getLastUpdatedText());
	}
}

 $(function(){

    $(".dropdown-menu li a").click(function(){
		$(this).parent().parent().prev().html($(this).text()+" <span class=\"caret\"></span>");
      	if($(this).parent().parent().attr('id') == "languageList")
      	{
      		localStorage.setItem("defaultLanguage",$(this).text());
      	}
      	else
      	{
      		localStorage.setItem("refreshTimeUnit",$(this).text());
      		sendMessage(backgroundPage.INITIATE_AFRESH);
      	}
   });

   $("#timeValue").change(function(){
   		localStorage.setItem('refreshTimeVal',$(this).val());
   		sendMessage(backgroundPage.INITIATE_AFRESH);
   });

});

 function getLastUpdatedText()
 {
 	var currentTime = new Date().getTime(),
 		readableTime,
 		diff = currentTime - backgroundPage.lastUpdated,
 		hoursStr="",
 		minutesStr="",
 		secondsStr="";
 	readableTime = convertMillisecondsToReadableForm(diff);
 	hoursStr = Math.floor(readableTime[0])>0 ? Math.floor(readableTime[0])+" hours" : "";
 	minutesStr = Math.floor(readableTime[1])>0 ? Math.floor(readableTime[1])+" minutes" : "";
 	secondsStr = Math.floor(readableTime[2])>0  ? Math.floor(readableTime[2])+" seconds ago." : (!hoursStr && !minutesStr ? "just now.":"");
 	return "Data last updated "+hoursStr+" "+minutesStr+" "+secondsStr;
 }

 function convertMillisecondsToReadableForm(milli)
 {
 	var arr = new Array(3);
 	milli = milli/1000;
 	arr[2] = milli%60;
 	milli = Math.floor(milli/60);
 	arr[1] = milli%60;
 	milli = Math.floor(milli/60);
 	arr[0] = milli;
 	return arr;
 }

 function sendMessage(msgType)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	chrome.extension.sendRequest(msgObject, function(response){
	});
}
 