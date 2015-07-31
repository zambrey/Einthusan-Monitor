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
		initiate();
	}

	function BackgroundObject()
	{
		var object = new Object();
		object.ContentManager = new ContentManager();
		object.PreferencesManager = new PreferencesManager();
		object.CookieManager = new CookieManager();
		object.LocalStorageManager = new LocalStorageManager();
		return object;
	}

	function constants()
	{
		//CONSTANT VALUES
		this.HOME_URL = "http://www.einthusan.com/";
		this.QUERY_PATH = "index.php?lang=";
		this.LIST_VIEW_STYLE = "listView";
		this.TILE_VIEW_STYLE = "tileView";

		//PREFERENCE RELATED CONSTANTS
		this.DEF_LANG_PREF = "defaultLanguagePref";
		this.REFRESH_TIME_VAL_PREF = "refreshTimeValPref";
		this.REFRESH_TIME_UNIT_PREF = "refreshTimeUnitPref";
		this.VIEW_STYLE_PREF = "viewStylePref";
		this.DEFAULT_REFRESH_TIME_VALUE = "3";
		this.DEFAULT_REFRESH_TIME_UNIT = "Hours";
		this.DEFAULT_VIEW_STYLE = this.LIST_VIEW_STYLE;

		//EXTERNAL COMMUNICATION KEYS
		this.LANGUAGES_REQUEST = "languageRequest";
		this.MOVIES_REQUEST = "moviesRequest";

		//INTER-SCRIPT COMMUNICATION KEYS
		this.RESET_NEW_FLAGS = "resetNewFlags";
		this.INITIATE_AGAIN = "initiateAgain";
		this.NEW_FLAGS_RESET_DONE = "newFlagsReset";
		this.INITIATED = "initiated";
		this.IS_DATA_READY_QUERY = "isDataReadyQuery";
		this.IS_DATA_READY_RESPONSE = "isDataReadyResponse"
	}

function initiate()
{
	isDataReady = false;
	requests = [];
	sendXMLRequest(CONSTANTS.HOME_URL, CONSTANTS.LANGUAGES_REQUEST, null);
	setTimeoutOrExecuteInitiate(null);
	backgroundObject.PreferencesManager.transitionPreferencesToChromeStorage();
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
		var langsNav = doc.getElementById("jumptolang");
		langs = langsNav.getElementsByTagName('li');
		backgroundObject.ContentManager.resetLanguages();
		for(i=0; i<langs.length; i++)
		{
			langName = langs[i].firstChild.innerHTML.split(' ')[0];
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
		//This call is to remove cookie from user's systems. Can be removed in next version.
		backgroundObject.CookieManager.clearCookies();
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

function updateNumberOfNewMovies(languageName, movieObjArray)
{
	var moviesCookie = null,
		details = new Object(),
		languageIndex = backgroundObject.ContentManager.getLanguageIndex(languageName);
	details.url = CONSTANTS.HOME_URL;
	details.name = languageName.toLowerCase()+'Movies';
	backgroundObject.LocalStorageManager.getLocalStorageValueForKey(details.name, compareNewDataAgainstStoredData);
}

function compareNewDataAgainstStoredData(keyAndData)
{
	var language = keyAndData['key'].substring(0,keyAndData['key'].indexOf("Movies")),
		language = language.substring(0,1).toUpperCase() + language.substring(1),
		moviesCookie = keyAndData['data'],
		languageIndex = backgroundObject.ContentManager.getLanguageIndex(language),
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

/*This function computes refresh interval value set by the user first.
  If argument is non-null, it call initiate if timeElapsed > refreshInterval. Otherwise it sets up timout call for initiate.*/
function setTimeoutOrExecuteInitiate(timeLapsedAfterLastUpdate)
{
	backgroundObject.LocalStorageManager.getLocalStorageValuesInBatch([backgroundObject.PreferencesManager.REFRESH_TIME_VALUE_KEY,backgroundObject.PreferencesManager.REFRESH_TIME_UNIT_KEY],
		function(keysAndData)
		{
			var refreshTimeVal = parseInt(keysAndData[backgroundObject.PreferencesManager.REFRESH_TIME_VALUE_KEY]),
				refreshTimeUnit = keysAndData[backgroundObject.PreferencesManager.REFRESH_TIME_UNIT_KEY],
				refreshInterval = 0;
			if(!refreshTimeVal || !refreshTimeUnit)
			{
				refreshInterval = REFRESH_INTERVAL;
				var defPrefs = {};
				defPrefs[CONSTANTS.REFRESH_TIME_VALUE_KEY] = CONSTANTS.DEFAULT_REFRESH_TIME_VALUE;
				defPrefs[CONSTANTS.REFRESH_TIME_UNIT_KEY] = CONSTANTS.DEFAULT_REFRESH_TIME_UNIT;
				backgroundObject.LocalStorageManager.setLocalStorageValuesInBatch(defPrefs);
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
			if(timeLapsedAfterLastUpdate!=null)
			{
				if(timeLapsedAfterLastUpdate >= refreshInterval)
				{
					initiate();
				}
			}
			else
			{
				setTimeout(initiate, refreshInterval);
			}
		});
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
				setTimeoutOrExecuteInitiate(diff);
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
	this.DEFAULT_LANGUAGE_KEY = "defaultLanguage";
	this.REFRESH_TIME_VALUE_KEY = "refreshTimeVal";
	this.REFRESH_TIME_UNIT_KEY = "refreshTimeUnit";
	this.VIEW_STYLE_KEY = "viewStyle";
	this.getPreferenceValue = function(preferenceType)
	{
		return localStorage.getItem(this.getLocalStorageKeyForPreferenceType(preferenceType));
	}
	this.getPreferenceValueAsync = function(preferenceType, preferenceHandler)
	{
		backgroundObject.LocalStorageManager.getLocalStorageValueForKey(this.getLocalStorageKeyForPreferenceType(preferenceType), preferenceHandler);
	}
	this.setPreferenceValue = function(preferenceType, preferenceValue)
	{
		//localStorage.setItem(this.getLocalStorageKeyForPreferenceType(preferenceType),preferenceValue);
		backgroundObject.LocalStorageManager.setLocalStorageValueForKey(this.getLocalStorageKeyForPreferenceType(preferenceType),preferenceValue);
	}
	this.getLocalStorageKeyForPreferenceType = function(preferenceType)
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
	this.transitionPreferencesToChromeStorage = function()
	{
		var prefs = {},
			defLang = this.getPreferenceValue(CONSTANTS.DEF_LANG_PREF),
			timeVal = this.getPreferenceValue(CONSTANTS.REFRESH_TIME_VAL_PREF),
			timeUnit = this.getPreferenceValue(CONSTANTS.VIEW_STYLE_PREF),
			viewStyle = this.getPreferenceValue(CONSTANTS.VIEW_STYLE_PREF);

		if(defLang)
		{
			prefs[this.DEFAULT_LANGUAGE_KEY] = defLang;
			localStorage.removeItem(this.DEFAULT_LANGUAGE_KEY);
		}
		if(timeVal)
		{
			prefs[this.REFRESH_TIME_VALUE_KEY] = timeVal;
			localStorage.removeItem(this.REFRESH_TIME_VALUE_KEY);
		}
		if(timeUnit)
		{
			prefs[this.REFRESH_TIME_UNIT_KEY] = timeUnit;
			localStorage.removeItem(this.REFRESH_TIME_UNIT_KEY);
		}
		if(viewStyle)
		{
			prefs[this.VIEW_STYLE_KEY] = viewStyle;
			localStorage.removeItem(this.VIEW_STYLE_KEY);
		}
		backgroundObject.LocalStorageManager.setLocalStorageValuesInBatch(prefs);
	}
}

/*Local Storage Manager*/
function LocalStorageManager()
{
	this.getLocalStorageValueForKey = function(key, dataHandler)
	{
		var oldMovieTitles = null;
		chrome.storage.sync.get(key, function(data){
			if(data && key.indexOf('Movies')>=0)
			{
				oldMovieTitles = backgroundObject.LocalStorageManager.processBeforeReturningData(data[key]);
				data = oldMovieTitles;
			}
			else
			{
				data = data[key];
			}
			if(dataHandler)
			{
				dataHandler({'key':key, 'data':data})
			}
		});
	}

	this.processBeforeReturningData = function(dataValue)
	{
		var oldMovieTitles,oldMovies;
		if(dataValue)
		{
			oldMovieTitles = new Array()
			oldMovies = dataValue.split('--');
			for(i=0; i<oldMovies.length; i++)
			{
				oldMovieTitles.push(oldMovies[i]);
			}
		}
		return decodeURIComponent(oldMovieTitles);
	}

	//keys: Array of keys
	this.getLocalStorageValuesInBatch = function(keys, dataHandler)
	{
		chrome.storage.sync.get(keys, function(data)
		{
			dataHandler(data);
		})
	}

	this.setLocalStorageValueForKey = function(key, data)
	{
		var details = {};
		details[key] = data;
		chrome.storage.sync.set(details, null);	
	}

	this.processBeforeSettingData = function(dataObjects)
	{
		var cookieString = '';
		for(i=0; i<dataObjects.length; i++)
		{
			cookieString = cookieString.concat(dataObjects[i].movieTitle);
			if(i<dataObjects.length-1)
			{
				cookieString = cookieString.concat('--');
			}
		}
		return encodeURIComponent(cookieString);
	}

	//data: Object with key-value pairs
	this.setLocalStorageValuesInBatch = function(data)
	{
		chrome.storage.sync.set(data, null);
	}
}

/*Cookie Manager*/
function CookieManager()
{
	this.clearCookies = function()
	{
		var languages = backgroundObject.ContentManager.getLanguagesData();
		for(var i=0; i<languages.length; i++)
		{
			chrome.cookies.remove({'url':CONSTANTS.HOME_URL, 'name':languages[i].toLowerCase()+'Movies'},null);
		}
	}
}
