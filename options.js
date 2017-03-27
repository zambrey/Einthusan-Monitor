/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	defaultLang = null,
	notifLang = null,
	timeVal = null,
	timeUnit = null,
	numAttempts = 0;

{
	backgroundPage.backgroundObject.LocalStorageManager.getLocalStorageValuesInBatch([backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY,
																					backgroundPage.CONSTANTS.REFRESH_TIME_VALUE_KEY,
																					backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_KEY,
																					backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY],
		function(keyAndData){
			defaultLang = keyAndData[backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY];
			notifLang = keyAndData[backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY];
			timeVal = keyAndData[backgroundPage.CONSTANTS.REFRESH_TIME_VALUE_KEY];
			timeUnit = keyAndData[backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_KEY];
			renderOptionsPage();
		});
}

function renderOnDataReady()
{
	var listHtml = "", 
		notifListHtml = "";
	languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
	ensureValidValues(languages);
	for(i=0; i<languages.length; i++)
	{
		listHtml = listHtml + "<li><a href=#>"+languages[i]+"</a></li>";
		if(!notifLang || (notifLang && notifLang[languages[i]]))
			notifListHtml = notifListHtml + "<span class=\"label label-success\">"+languages[i]+"</span>";
		else
			notifListHtml = notifListHtml + "<span class=\"label label-danger\">"+languages[i]+"</span>";
	}
	$("#languageList").html(listHtml);
	$("#showChecklist").html(notifListHtml);
	$("#notifChecklist").html(notifListHtml);
	setLastUpdatedText();
	setInteraction();
	$("#selectedLanguage").html(defaultLang+" <span class=\"caret\"></span>");
	$("#timeValue").val(timeVal);
	$("#selectedTimeUnit").html(timeUnit+" <span class=\"caret\"></span>");	
}

function setTimeoutOnDataNotReady()
{
	if(numAttempts++ < 15)
		setTimeout(renderOptionsPage,1000);
	else
		showError();
}

function ensureValidValues(languages)
{
	if(!defaultLang)
	{
		backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY, languages[0]);
	}
	if(!notifLang)
	{
		var prefNotif = {};
   		for(var i=0; i<languages.length; i++)
   		{
   			prefNotif[languages[i]] = true;
   		}
   		backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY, prefNotif);
	}
}

function renderOptionsPage()
{
	sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
}

function setInteraction()
{

    $(".dropdown-menu li a").click(function(){
		$(this).parent().parent().prev().html($(this).text()+" <span class=\"caret\"></span>");
      	if($(this).parent().parent().attr('id') == "languageList")
      	{
      		backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY, $(this).text());
      	}
      	else
      	{
      		backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_KEY, $(this).text());
      		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
      	}
   });

   $("#timeValue").change(function(){
   		backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.REFRESH_TIME_VALUE_KEY, $(this).val());
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

   $(".glyphicon-refresh").click(function(){
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   })
	$("#notifChecklist span").click(function(event){
		$(event.target).toggleClass("label-danger label-success");
   		var notifList = $("#notifChecklist span"),
   			prefNotif = {};
   		for(var i=0; i<notifList.length; i++)
   		{
   			prefNotif[notifList[i].innerText] = $(notifList[i]).hasClass("label-danger")?false:true;// notifList[i].checked;
   		}
   		backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY, prefNotif);
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });
}

function setLastUpdatedText()
{
	$(".lastUpdated").text(getLastUpdatedText());
	setTimeout(setLastUpdatedText, 1*60*1000);	//Update text every 1 mins
}

function getLastUpdatedText()
{
	var currentTime = new Date().getTime(),
		readableTime,
		diff = currentTime - backgroundPage.lastUpdated,
		hoursStr="",
		minutesStr="",
		secondsStr="",
		hour, minute, second;
	if(backgroundPage.lastUpdated < 0)
	{
		return "Data will be updated soon.";
	}
	readableTime = convertMillisecondsToReadableForm(diff);
	hour = Math.floor(readableTime[0]);
	minute = Math.floor(readableTime[1]);
	second = Math.floor(readableTime[2]);
	if(hour == 0 && minute == 0 && second == 0)
	{
		return "Data updated just now."
	}
	hoursStr = hour>0 ? hour+" hours" : "";
	minutesStr = minute>0 ? minute+" minutes" : "";
	secondsStr = second>0  ? second+" seconds" : "";
	return "Data last updated "+hoursStr+" "+minutesStr+" "+secondsStr + " ago.";
}

function showError()
{
	$(".lastUpdated").text("Something went wrong.");
	$(".lastUpdated").attr('class','lastUpdatedError');
}

function convertMillisecondsToReadableForm(milli)
{
	var arr = new Array(3);
	milli = milli/1000;
	for(var i=2; i>=0; i--)
	{
		arr[i] = milli%60;
		milli = Math.floor(milli/60);
	}
	return arr;
}

function sendMessage(msgType)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	if(msgType == backgroundPage.CONSTANTS.INITIATE_AGAIN)
	{
		$(".glyphicon-refresh").addClass('glyphicon-refresh-rotate');
	}
	chrome.extension.sendRequest(msgObject, function(response){
		if(response.messageType == backgroundPage.CONSTANTS.IS_DATA_READY_RESPONSE)
		{
			if(response.status)
			{
				renderOnDataReady();
			}
			else
			{
				setTimeoutOnDataNotReady();
			}
		}
	});
}

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.messageType == backgroundPage.CONSTANTS.INITIATED)
		{
			setLastUpdatedText();
			$(".glyphicon-refresh").removeClass('glyphicon-refresh-rotate');
		}	
	});
 