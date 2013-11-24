/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundObject = null,
	CONSTANTS = null,
	newMoviesCnt,
	langsChecked,
	isDataReady = false,
	lastUpdated = -1,
	requests,
	REFRESH_INTERVAL = 3*60*60*1000; //Three hour

{
	if(!backgroundObject)
		backgroundObject = new BackgroundObject();
	if(!CONSTANTS)
		CONSTANTS = new constants();
	chrome.cookies.getAllCookieStores(confirmCookieStoreAccess);
}

function confirmCookieStoreAccess(cstores)
{
	if(cstores.length > 0)
	{
		initiate();
	}
	else
	{
		setTimeout(function(){chrome.cookies.getAllCookieStores(confirmCookieStoreAccess);},2000);
	}
}

function BackgroundObject()
{
	var object = new Object();
	object.ContentManager = new ContentManager();
	object.PreferencesManager = new PreferencesManager();
	object.CookieManager = new CookieManager();
	return object;
}

function constants()
{
	var object = new Object();
	
	//CONSTANT VALUES
	object.HOME_URL = "http://www.einthusan.com/";
	object.QUERY_PATH = "index.php?lang=";
	object.LIST_VIEW_STYLE = "listView";
	object.TILE_VIEW_STYLE = "tileView";

	//PREFERENCE RELATED CONSTANTS
	object.DEF_LANG_PREF = "defaultLanguagePref";
	object.REFRESH_TIME_VAL_PREF = "refreshTimeValPref";
	object.REFRESH_TIME_UNIT_PREF = "refreshTimeUnitPref";
	object.VIEW_STYLE_PREF = "viewStylePref";
	object.DEFAULT_REFRESH_TIME_VALUE = "3";
	object.DEFAULT_REFRESH_TIME_UNIT = "Hours";
	object.DEFAULT_VIEW_STYLE = object.LIST_VIEW_STYLE;

	//EXTERNAL COMMUNICATION KEYS
	object.LANGUAGES_REQUEST = "languageRequest";
	object.MOVIES_REQUEST = "moviesRequest";

	//INTER-SCRIPT COMMUNICATION KEYS
	object.RESET_NEW_FLAGS = "resetNewFlags";
	object.INITIATE_AGAIN = "initiateAgain";
	object.NEW_FLAGS_RESET_DONE = "newFlagsReset";
	object.INITIATED = "initiated";
	object.IS_DATA_READY_QUERY = "isDataReadyQuery";
	object.IS_DATA_READY_RESPONSE = "isDataReadyResponse"

	return object;
}

function initiate()
{
	isDataReady = false;
	requests = [];
	sendXMLRequest(CONSTANTS.HOME_URL, CONSTANTS.LANGUAGES_REQUEST, null);
	setTimeout(initiate, getRefreshInterval());
}

function getMovieTitlesForLanguage(languageName)
{
	sendXMLRequest(CONSTANTS.HOME_URL+CONSTANTS.QUERY_PATH+languageName.toLowerCase(), CONSTANTS.MOVIES_REQUEST, languageName);
}

function sendXMLRequest(url, requestType, languageName, responseHandler)
{
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	request.onreadystatechange = getResponseHandler(request, requestType, languageName, handleXMLRequestResponse);
	request.send();
	requests.push(request);
}

function handleXMLRequestResponse(request, requestType, languageName, responseText)
{
	if(requestType == CONSTANTS.LANGUAGES_REQUEST)
	{
		var doc = document.implementation.createHTMLDocument("languages"),langs;
		doc.documentElement.innerHTML = responseText;
		langs = doc.getElementsByTagName('li');
		backgroundObject.ContentManager.resetLanguages();
		for(i=0; i<langs.length; i++)
		{
			langName = langs[i].firstChild.innerHTML;
			backgroundObject.ContentManager.addLanguage(langName);
		}
		backgroundObject.ContentManager.resetMovies();
		newMoviesCnt = new Array(); newMoviesCnt.length = backgroundObject.ContentManager.getLanguagesData().length;
		langsChecked = new Array(); langsChecked.length = backgroundObject.ContentManager.getLanguagesData().length;

		for(i=0; i<backgroundObject.ContentManager.getLanguagesData().length; i++)
		{
			langsChecked[i] = 0;
			newMoviesCnt[i] = 0;
			getMovieTitlesForLanguage(backgroundObject.ContentManager.getLanguagesData()[i]);
		}
	}
	else if(requestType == CONSTANTS.MOVIES_REQUEST)
	{	
		var	movieObjArray, 
			movieElems, 
			movieCovers,
			movieDetails;
		doc= document.implementation.createHTMLDocument("movies");
		doc.documentElement.innerHTML = responseText;
		movieObjArray = new Array();
		movieElems = doc.getElementsByClassName("movie-title");
		movieCovers = doc.getElementsByClassName("movie-cover-wrapper");
		movieDetails = doc.getElementsByClassName("desc_body");
		for(i=0; i<movieElems.length; i++)
		{
			movieDetails[i].removeChild(movieDetails[i].childNodes[1]);
			movieObjArray.push(new MovieObject(	movieElems[i].innerHTML.split(' - ')[0],
												movieCovers[i].firstChild.getAttribute('src'),
												"Starring "+movieDetails[i].innerText.substring(3),
												movieCovers[i].getAttribute('href')));
		}
		backgroundObject.ContentManager.setMoviesData(capitaliseFirstLetter(languageName), movieObjArray);
		updateNumberOfNewMovies(languageName, movieObjArray);
	}
	requests.splice(requests.indexOf(request),1);
	if(requests.length == 0)
	{
		updateCompleted();
	}
}

function getResponseHandler(req, requestType, languageName, responseHandler)
{
	return function()
	{
		if(req.readyState == 4 && req.status == 200)
		{
			if(responseHandler)
			{
				responseHandler(req, requestType, languageName, req.responseText);
			}
		}
		else if(req.status == 0 || req.status >= 400)
		{
			requests.splice(requests.indexOf(req),1);
		}
	}
}

function breakCookieString(cookieString)
{
	var oldMovieTitles,oldMovies;
	if(cookieString)
	{
		oldMovieTitles = new Array()
		oldMovies = cookieString.split('--');
		for(i=0; i<oldMovies.length; i++)
		{
			oldMovieTitles.push(oldMovies[i]);
		}
	}
	return oldMovieTitles;
}

function getCookie(languageName)
{
	var details = new Object(), oldMovieTitles;
	details.url = homeUrl;
	details.name = languageName.toLowerCase()+'Movies';
	chrome.cookies.get(details, function(cookie){
		oldMovieTitles = breakCookieString(cookie.value);
	});
	return oldMovieTitles;
}

function updateNumberOfNewMovies(languageName, movieObjArray)
{
	var moviesCookie = null,
		details = new Object(),
		languageIndex = backgroundObject.ContentManager.getLanguageIndex(languageName);
	details.url = CONSTANTS.HOME_URL;
	details.name = languageName.toLowerCase()+'Movies';
	backgroundObject.CookieManager.getCookie(languageName, compareNewDataAgainstCookie);
}

function compareNewDataAgainstCookie(language, moviesCookie)
{
	var languageIndex = backgroundObject.ContentManager.getLanguageIndex(language),
		movieObjArray = backgroundObject.ContentManager.getMoviesData(language);
	if(!moviesCookie)
	{
		newMoviesCnt[languageIndex] += movieObjArray.length;
		for(i=0; i<movieObjArray.length; i++)
		{
			movieObjArray[i].isNew = true;
		}
	}
	else
	{
		for(i=0; i<movieObjArray.length; i++)
		{
			var movieTitle = movieObjArray[i].movieTitle;
			if(moviesCookie.indexOf(movieTitle) < 0)
			{
				newMoviesCnt[backgroundObject.ContentManager.getLanguagesData().indexOf(language)]++;
				movieObjArray[i].isNew = true;
			}
			else
			{
				break;
			}
		}	
	}
	langsChecked[languageIndex] = 1;
}

function updateCompleted()
{
	if(sumUpArray(langsChecked) == backgroundObject.ContentManager.getLanguagesData().length)
	{
		
		isDataReady = true;
		lastUpdated = new Date().getTime();
		sendMessage(CONSTANTS.INITIATED);
		setBadge();
	}
	else
	{
		setTimeout(updateCompleted, 1000);
	}
}


function capitaliseFirstLetter(string)
{
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function sumUpArray(arr)
{
	var sum = 0;
	for(i=0; i<arr.length; i++)
	{
		sum += arr[i];
	}
	return sum;
}

function getRefreshInterval()
{
	var refreshTimeVal = parseInt(backgroundObject.PreferencesManager.getPreferenceValue(CONSTANTS.REFRESH_TIME_VAL_PREF)),
		refreshTimeUnit = backgroundObject.PreferencesManager.getPreferenceValue(CONSTANTS.REFRESH_TIME_UNIT_PREF),
		refreshInterval = 0;
	if(!refreshTimeVal || !refreshTimeUnit)
	{
		refreshInterval = REFRESH_INTERVAL;
		backgroundObject.PreferencesManager.setPreferenceValue(CONSTANTS.REFRESH_TIME_VAL_PREF, CONSTANTS.DEFAULT_REFRESH_TIME_VALUE);
		backgroundObject.PreferencesManager.setPreferenceValue(CONSTANTS.REFRESH_TIME_UNIT_PREF, CONSTANTS.DEFAULT_REFRESH_TIME_UNIT);
	}
	else
	{
		refreshInterval = refreshTimeVal * 1000;
		if(refreshTimeUnit == "Minutes")
		{
			refreshInterval = refreshInterval * 60;
		}
		if(refreshTimeUnit == "Hours")
		{
			refreshInterval = refreshInterval * 60 * 60;
		}
	} 
	return refreshInterval;	
}

function MovieObject(title, coverSrc, details, watchURL)
{
	var mo =  new Object();
	mo.movieTitle = title;
	mo.movieCover = coverSrc;
	mo.movieDetails = details;
	mo.watchURL = watchURL;
	mo.isNew = false;
	return mo;
}

function resetNewFlags(language)
{
	var index = backgroundObject.ContentManager.getLanguagesData().indexOf(language),
		movieList = backgroundObject.ContentManager.getMoviesData(language);
	newMoviesCnt[index] = 0;
	for(i=0; i<movieList.length; i++)
	{
		movieList[i].isNew = false;
	}
	setBadge();
}

function setBadge()
{
	var badgeNumber = sumUpArray(newMoviesCnt);
	if(badgeNumber > 0)
	{
		chrome.browserAction.setBadgeText({"text":badgeNumber.toString()});//248,148,6
		chrome.browserAction.setBadgeBackgroundColor({"color":[248,148,6,200]});	
	}
	else
	{
		chrome.browserAction.setBadgeText({"text":"".toString()});		
	}
}

function sendMessage(msgType)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	chrome.extension.sendRequest(msgObject, function(response){});
}

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.messageType == CONSTANTS.RESET_NEW_FLAGS)
		{
			if(request.language)
			{
				resetNewFlags(request.language);
				sendResponse({messageType: CONSTANTS.NEW_FLAGS_RESET_DONE, language:request.language});
			}
		}
		if(request.messageType == CONSTANTS.INITIATE_AGAIN)
		{
			initiate();
		}
		if(request.messageType == CONSTANTS.IS_DATA_READY_QUERY)
		{
			sendResponse({messageType: CONSTANTS.IS_DATA_READY_RESPONSE, status: isDataReady});
			if(!isDataReady && lastUpdated != -1 && requests.length == 0)
			{
				var diff = new Date().getTime() - lastUpdated;
				if(diff >= getRefreshInterval())
				{
					initiate();
				}	
			}
		}	
	});



/*Content Manager*/
function ContentManager()
{
	var contentObject = new Object();
	contentObject.languages = [];
	contentObject.movies = [];
	contentObject.resetLanguages = function()
	{
		this.languages = [];
	}
	contentObject.resetMovies = function()
	{
		this.movies.length = this.languages.length;
	}
	contentObject.getLanguageIndex = function(language)
	{
		return this.languages.indexOf(language);
	}
	contentObject.addLanguage = function(language)
	{
		this.languages.push(language);
	}
	contentObject.getLanguagesData = function()
	{
		return this.languages;
	}
	contentObject.getMoviesData = function(language)
	{	
		return this.movies[this.getLanguageIndex(language)];
	}
	contentObject.getAllMoviesData = function()
	{
		return this.movies;
	}
	contentObject.setLanguagesData = function(languages)
	{
		this.languages = languages;
	}
	contentObject.setMoviesData = function(language, moviesData)
	{
		this.movies[this.getLanguageIndex(language)] = moviesData;
	}
	contentObject.setAllMoviesData = function(moviesData)
	{
		this.movies = moviesData;
	}
	contentObject.setNewFlag = function(language, index)
	{
		this.movies[this.getLanguageIndex(language)][index] = true;
	}
	contentObject.resetNewFlags = function(language)
	{
		//Implement later	
	}
	return contentObject;
}

/*Preferences Manager*/
function PreferencesManager()
{
	var prefObject =  new Object();
	prefObject.DEFAULT_LANGUAGE_KEY = "defaultLanguage";
	prefObject.REFRESH_TIME_VALUE_KEY = "refreshTimeVal";
	prefObject.REFRESH_TIME_UNIT_KEY = "refreshTimeUnit";
	prefObject.VIEW_STYLE_KEY = "viewStyle";
	prefObject.getPreferenceValue = function(preferenceType)
	{	
		return localStorage.getItem(this.getLocalStorageKeyForPreferenceType(preferenceType));
	}
	prefObject.setPreferenceValue = function(preferenceType, preferenceValue)
	{
		localStorage.setItem(this.getLocalStorageKeyForPreferenceType(preferenceType),preferenceValue);
	}
	prefObject.getLocalStorageKeyForPreferenceType = function(preferenceType)
	{
		var prefKey = null;
		if(preferenceType == CONSTANTS.DEF_LANG_PREF)
		{
			prefKey = this.DEFAULT_LANGUAGE_KEY;
		}
		else if(preferenceType == CONSTANTS.REFRESH_TIME_VAL_PREF)
		{
			prefKey = this.REFRESH_TIME_VALUE_KEY;
		}
		else if(preferenceType == CONSTANTS.REFRESH_TIME_UNIT_PREF)
		{
			prefKey = this.REFRESH_TIME_UNIT_KEY;
		}
		else if(preferenceType == CONSTANTS.VIEW_STYLE_PREF)
		{
			prefKey = this.VIEW_STYLE_KEY;
		}
		return prefKey;
	}
	return prefObject;
}

/*Cookie Manager*/
function CookieManager()
{
	var cookieObject = new Object();
	cookieObject.cookieValidDuration = 60*60*24*30*12,
	cookieObject.getCookie = function(language, cookieHandler)
	{
		var details = new Object(), oldMovieTitles = null;
		details.url = CONSTANTS.HOME_URL;
		details.name = language.toLowerCase()+'Movies';
		chrome.cookies.get(details, function(cookie){
			if(cookie)
			{
				oldMovieTitles = backgroundObject.CookieManager.processBeforeReturningCookie(cookie.value);
			}
			if(cookieHandler)
			{
				cookieHandler(language, oldMovieTitles)
			}
		});
		return oldMovieTitles;
	}
	cookieObject.setCookie = function(language, cookieValue)
	{
		var details = new Object();
		details.url = CONSTANTS.HOME_URL;
		details.name = language.toLowerCase()+'Movies';
		details.value = this.processBeforeSettingCookie(cookieValue);
		details.expirationDate = (new Date().getTime()/1000) + this.cookieValidDuration;
		chrome.cookies.remove({"url":CONSTANTS.HOME_URL,"name":details.name});
		chrome.cookies.set(details);
	}
	cookieObject.processBeforeReturningCookie = function(cookieString)
	{
		var oldMovieTitles,oldMovies;
		if(cookieString)
		{
			oldMovieTitles = new Array()
			oldMovies = cookieString.split('--');
			for(i=0; i<oldMovies.length; i++)
			{
				oldMovieTitles.push(oldMovies[i]);
			}
		}
		return decodeURIComponent(oldMovieTitles);
	}
	cookieObject.processBeforeSettingCookie = function(cookieValue)
	{
		var cookieString = '';
		for(i=0; i<cookieValue.length; i++)
		{
			cookieString = cookieString.concat(cookieValue[i].movieTitle);
			if(i<cookieValue.length-1)
			{
				cookieString = cookieString.concat('--');
			}
		}
		return encodeURIComponent(cookieString);
	}
	return cookieObject;
}