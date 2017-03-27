/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */


 var debug = true,
 	 backgroundObject = null,
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
		chrome.runtime.setUninstallURL(CONSTANTS.UNINSTALL_URL);
		initiate();
	}

	function BackgroundObject()
	{
		var object = new Object();
		object.ContentManager = new ContentManager();
		object.LocalStorageManager = new LocalStorageManager();
		return object;
	}

	function constants()
	{
		//CONSTANT VALUES
		this.HOME_URL = "https://einthusan.tv";
		this.QUERY_PATH = "/movie/browse/?lang=";
		this.LIST_VIEW_STYLE = "listView";
		this.TILE_VIEW_STYLE = "tileView";
		this.UNINSTALL_URL = "http://goo.gl/forms/dtfJ9uPcW3";

		//PREFERENCE RELATED CONSTANTS
		this.DEFAULT_LANGUAGE_KEY = "defaultLanguage";
		this.DISPLAY_LANGUAGE_KEY = "displayLanguage";
		this.NOTIFICATIONS_LANGUAGE_KEY = "notifLanguage";
		this.REFRESH_TIME_VALUE_KEY = "refreshTimeVal";
		this.REFRESH_TIME_UNIT_KEY = "refreshTimeUnit";
		this.VIEW_STYLE_KEY = "viewStyle";
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
	transitionPreferencesToChromeStorage();
}

function getMovieTitlesForLanguage(languageName)
{
	// https://einthusan.tv/movie/browse/?lang=hindi
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
			langName = langs[i].firstChild.childNodes[2].innerText;
			backgroundObject.ContentManager.addLanguage(langName);
		}
		backgroundObject.ContentManager.resetMovies();
		newMoviesCnt = new Array(); newMoviesCnt.length = backgroundObject.ContentManager.getLanguagesData().length;
		langsChecked = new Array(); langsChecked.length = backgroundObject.ContentManager.getLanguagesData().length;

		for(i=0; i<backgroundObject.ContentManager.getLanguagesData().length; i++)
		{
			langsChecked[i] = 0;
			newMoviesCnt[i] = 0;
			transitionCookiesToChromeStorage(backgroundObject.ContentManager.getLanguagesData()[i]);
			getMovieTitlesForLanguage(backgroundObject.ContentManager.getLanguagesData()[i]);
		}
		removeOtherCookies();
	}
	else if(requestType == CONSTANTS.MOVIES_REQUEST)
	{
		var	movieObjArray,
			featuredMovies,
			movieTitles,
			movieCovers,
			movieDetails;
		doc= document.implementation.createHTMLDocument("movies");
		doc.documentElement.innerHTML = responseText;
		movieObjArray = new Array();
		featuredMovies = doc.getElementById("UIFeaturedFilms");
		movieCovers = doc.getElementsByClassName("block1");
		movieDetails = doc.getElementsByClassName("professionals");
		movieTitles = featuredMovies.getElementsByClassName("title");
		for(var i=0; i<movieTitles.length; i++)
		{
			var direction = new Array(),
				lead = new Array(),
				music = new Array(),
				supporting = new Array();
			var professionalLabels = movieDetails[i].getElementsByTagName("label");
			for(var j=0; j<professionalLabels.length; j++)
			{
				var currLabel = professionalLabels[j].innerText.toLowerCase();
				if(currLabel == "lead") 
				{
					lead.push(professionalLabels[j].previousSibling.innerText);
				}
				else if(currLabel == "director")
				{
					direction.push(professionalLabels[j].previousSibling.innerText);
				}
				else if(currLabel == "music director")
				{
					music.push(professionalLabels[j].previousSibling.innerText);
				}
				else if(currLabel == "supporting")
				{
					supporting.push(professionalLabels[j].previousSibling.innerText);
				}
			}
			movieObjArray.push(new MovieObject(	movieTitles[i].firstChild.innerText,
				"http:"+movieCovers[i].getElementsByTagName("img")[0].getAttribute('src'),
				lead,
				supporting,
				direction,
				music,
				movieTitles[i].getAttribute('href')));
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
		language = capitaliseFirstLetter(language);
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

/*This function computes refresh interval value set by the user first.
  If argument is non-null, it call initiate if timeElapsed > refreshInterval. Otherwise it sets up timout call for initiate.*/
function setTimeoutOrExecuteInitiate(timeLapsedAfterLastUpdate)
{
	backgroundObject.LocalStorageManager.getLocalStorageValuesInBatch([CONSTANTS.REFRESH_TIME_VALUE_KEY,CONSTANTS.REFRESH_TIME_UNIT_KEY],
		function(keysAndData)
		{
			var refreshTimeVal = parseInt(keysAndData[CONSTANTS.REFRESH_TIME_VALUE_KEY]),
				refreshTimeUnit = keysAndData[CONSTANTS.REFRESH_TIME_UNIT_KEY],
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

function MovieObject(title, coverSrc, lead, supporting, direction, music, watchURL)
{
	this.movieTitle = title;
	this.movieCover = coverSrc;
	this.direction = direction;
	this.lead = lead;
	this.supporting = supporting;
	this.music = music;
	this.watchURL = watchURL;
	this.isNew = false;
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

function sumUpArraySelectively(arrayToSum, includeInSum)
{
	var sum = 0,
		languagesList = backgroundObject.ContentManager.getLanguagesData();
	for(i=0; i<arrayToSum.length; i++)
	{
		if(!includeInSum || (includeInSum && includeInSum[languagesList[i]]))
		{
			sum += arrayToSum[i];
		}
	}
	return sum;
}

function sumUpArray(arrayToSum)
{
	var sum = 0;
	for(i=0; i<arrayToSum.length; i++)
	{
		sum += arrayToSum[i];
	}
	return sum;	
}

function setBadge()
{
	backgroundObject.LocalStorageManager.getLocalStorageValueForKey(CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY, function(notifLangs){
		notifLangs = notifLangs["data"];
		var badgeNumber = sumUpArraySelectively(newMoviesCnt, notifLangs);
		if(badgeNumber > 0)
		{
			chrome.browserAction.setBadgeText({"text":badgeNumber.toString()});//248,148,6
			chrome.browserAction.setBadgeBackgroundColor({"color":[248,148,6,200]});
		}
		else
		{
			chrome.browserAction.setBadgeText({"text":"".toString()});
		}
	});
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
	
}

/*Local Storage Manager*/
function LocalStorageManager()
{
	this.getLocalStorageValueForKey = function(key, dataHandler)
	{
		var oldMovieTitles = null;
		chrome.storage.sync.get(key, function(data){
			data = data[key];
			if(dataHandler)
			{
				dataHandler({'key':key, 'data':data})
			}
		});
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

	this.buildMovieNamesArray = function(dataObjects)
	{
		var movieNamesArr = [];
		for(i=0; i<dataObjects.length; i++)
		{
			movieNamesArr.push(dataObjects[i].movieTitle);
		}
		return movieNamesArr;
	}

	//data: Object with key-value pairs
	this.setLocalStorageValuesInBatch = function(data)
	{
		chrome.storage.sync.set(data, null);
	}
}

function transitionPreferencesToChromeStorage()
{
	var prefs = {},
		defLang = localStorage.getItem(CONSTANTS.DEFAULT_LANGUAGE_KEY),
		timeVal = localStorage.getItem(CONSTANTS.REFRESH_TIME_VALUE_KEY),
		timeUnit = localStorage.getItem(CONSTANTS.REFRESH_TIME_UNIT_KEY),
		viewStyle = localStorage.getItem(CONSTANTS.VIEW_STYLE_KEY);

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

function transitionCookiesToChromeStorage(language)
{
	var details = new Object(), oldMovieTitles = null;
	details.url = CONSTANTS.HOME_URL;
	details.name = language.toLowerCase()+'Movies';
	chrome.cookies.get(details, function(cookie){
		if(cookie)
		{
			var cookieString = decodeURIComponent(cookie.value);
			backgroundObject.LocalStorageManager.setLocalStorageValueForKey(details.name, cookieString.split("--"));
			chrome.cookies.remove(details,null);
		}
	});
}

/*Some cookies were created when extension was malfuncitoning. Removing those*/
function removeOtherCookies()
{
	chrome.cookies.getAll({url:CONSTANTS.HOME_URL}, function(cookies)
	{
		for(var i=0; i<cookies.length; i++)
		{
			if(cookies[i].name.indexOf("Movies")>=0)
			{
				chrome.cookies.remove({url:CONSTANTS.HOME_URL,name:cookies[i].name}, null)
			}
			
		}
	});
}

function debugLog(message)
{
	if(debug)
	{
		console.log(message);
	}
}

function alertLog(message)
{
	if(debug)
	{
		alert(message);
	}
}