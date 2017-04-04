/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	numAttempts = 0;

confirmIfDataReady();

function confirmIfDataReady()
{
	sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
}

function renderOnDataReady()
{
	var notifLang = backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY],
		showLang = backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.SHOW_LANGUAGE_KEY],
		listHtml = "", 
		notifListHtml = "",
		showListHtml = "";
	languages = backgroundPage.contentManager.getLanguagesData();
	if(languages == null)
	{
		$("#preferencesTable").css("display", "none");
		$("#panel-body-error").css("display", "block");	
		return;
	}
	for(i=0; i<languages.length; i++)
	{
		listHtml = listHtml + "<li><a href=#>"+languages[i]+"</a></li>";
		if(!notifLang || (notifLang && notifLang[languages[i]]))
			notifListHtml = notifListHtml + "<span class=\"label label-success\">"+languages[i]+"</span>";
		else
			notifListHtml = notifListHtml + "<span class=\"label label-danger\">"+languages[i]+"</span>";
		if(!showLang || (showLang && showLang[languages[i]]))
			showListHtml = showListHtml + "<span class=\"label label-success\">"+languages[i]+"</span>";
		else
			showListHtml = showListHtml + "<span class=\"label label-danger\">"+languages[i]+"</span>";

	}
	$("#languageList").html(listHtml);
	$("#showChecklist").html(showListHtml);
	$("#notifChecklist").html(notifListHtml);
	setLastUpdatedText();
	setInteraction();
	$("#selectedLanguage").html(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY]+" <span class=\"caret\"></span>");
	$("#timeValue").val(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.REFRESH_TIME_VALUE_KEY]);
	$("#selectedTimeUnit").html(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_KEY]+" <span class=\"caret\"></span>");	
}

function setTimeoutOnDataNotReady()
{
	if(numAttempts++ < 15)
		setTimeout(confirmIfDataReady,1000);
	else
		showError();
}

function setInteraction()
{

    $(".dropdown-menu li a").click(function(){
		$(this).parent().parent().prev().html($(this).text()+" <span class=\"caret\"></span>");
      	if($(this).parent().parent().attr('id') == "languageList")
      	{
      		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY, $(this).text());
      	}
      	else
      	{
      		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_UNIT_KEY, $(this).text());
      		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
      	}
   });

   $("#timeValue").change(function(){
   		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.REFRESH_TIME_VALUE_KEY, $(this).val());
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

   $(".glyphicon-refresh").click(function(){
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });
	
	$("#notifChecklist span").click(function(event){
		if($($(event.target)[0]).hasClass("label-danger"))
		{
			var lang = $(event.target)[0].innerText,
				showLang = backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.SHOW_LANGUAGE_KEY];
			if(!showLang[lang])
			{
				alert("Notifcations can be shown only if the language is shown.");
				return;
			}
		}
		$(event.target).toggleClass("label-danger label-success");
   		var notifList = $("#notifChecklist span"),
   			prefNotif = {};
   		for(var i=0; i<notifList.length; i++)
   		{
   			prefNotif[notifList[i].innerText] = $(notifList[i]).hasClass("label-danger") ? false : true;
   		}
   		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY, prefNotif);
   		sendMessage(backgroundPage.CONSTANTS.INITIATE_AGAIN);
   });

	$("#showChecklist span").click(function(event){
		$(event.target).toggleClass("label-danger label-success");
		if($($(event.target)[0]).hasClass("label-danger"))
		{
			$("#notifChecklist span:contains("+$(event.target)[0].innerText+")").removeClass("label-success").addClass("label-danger");
		}
   		var showList = $("#showChecklist span"),
   			notifList = $("#notifChecklist span"),
   			prefShow = {},
   			prefNotif = {};
   		for(var i=0; i<showList.length; i++)
   		{
   			prefShow[showList[i].innerText] = $(showList[i]).hasClass("label-danger") ? false : true;
   			prefNotif[notifList[i].innerText] = $(notifList[i]).hasClass("label-danger") ? false : true;
   		}
   		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.SHOW_LANGUAGE_KEY, prefShow);
   		backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY, prefNotif);
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
 