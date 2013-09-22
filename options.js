/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	defaultLang = backgroundPage.backgroundObject.PreferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.DEF_LANG_PREF),
	timeVal = backgroundPage.backgroundObject.PreferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_VAL_PREF),
	timeUnit = backgroundPage.backgroundObject.PreferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_PREF);

{
	if(backgroundPage)
	{
		var listHtml = "",
			languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
		for(i=0; i<languages.length; i++)
		{
			listHtml = listHtml + "<li><a href=#>"+languages[i]+"</a></li>";
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
      		backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.DEF_LANG_PREF, $(this).text());
      	}
      	else
      	{
      		backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_PREF, $(this).text());
      		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
      	}
   });

   $("#timeValue").change(function(){
   		backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_VAL_PREF, $(this).val());
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
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
 