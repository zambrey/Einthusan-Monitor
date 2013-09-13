/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var languages = new Array(),
	fetchedTitles = new Array(),
	done = 4, 
	ok = 200,
	homeUrl = "http://www.einthusan.com/",
	queryPath = "index.php?lang=",
	newMoviesCnt,
	langsChecked,
	isDataReady = false,
	LANGUAGE_REQUEST_CONST = "languageRequest",
	MOVIES_REQUEST_CONST = "moviesRequest",
	RESET_NEW_FLAGS = "resetNewFlags",
	INITIATE_AFRESH = "initiateAfresh",
	FLAGS_RESET = "flagsReset",
	lastUpdated = 0,
	REFRESH_INTERVAL = 3*60*60*1000; //Three hour

{
	initiate();
}

function initiate()
{
	sendXMLRequest(homeUrl, LANGUAGE_REQUEST_CONST, null);
	setTimeout(initiate, getRefreshInterval());
	lastUpdated = new Date().getTime();
}

function getMovieTitlesForLanguage(languageName)
{
	sendXMLRequest(homeUrl+queryPath+languageName.toLowerCase(), MOVIES_REQUEST_CONST, languageName);
}

function sendXMLRequest(url, requestType, languageName, responseHandler)
{
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	request.onreadystatechange = getResponseHandler(request, requestType, languageName, handleXMLRequestResponse);
	request.send();
}

function handleXMLRequestResponse(requestType, languageName, responseText)
{
	if(requestType == LANGUAGE_REQUEST_CONST)
	{
		var doc = document.implementation.createHTMLDocument("languages"),langs;
		doc.documentElement.innerHTML = responseText;
		langs = doc.getElementsByTagName('li');
		languages = [];
		for(i=0; i<langs.length; i++)
		{
			langName = langs[i].firstChild.innerHTML;
			languages.push(langName);
		}
		fetchedTitles.length = languages.length;
		newMoviesCnt = new Array(); newMoviesCnt.length = languages.length;
		langsChecked = new Array(); langsChecked.length = languages.length;

		for(i=0; i<languages.length; i++)
		{
			langsChecked[i] = 0;
			newMoviesCnt[i] = 0;
			getMovieTitlesForLanguage(languages[i]);
		}
		setTimeout(fireNotification, 1000);
	}
	else if(requestType == MOVIES_REQUEST_CONST)
	{	
		var	languageIndex = languages.indexOf(capitaliseFirstLetter(languageName)),
			movieObjArray, 
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
		fetchedTitles[languageIndex] = movieObjArray;
		updateNumberOfNewMovies(languageName, movieObjArray);
	}
}

function getResponseHandler(req, requestType, languageName, responseHandler)
{
	return function()
	{
		if(req.readyState == done && req.status == ok)
		{
			if(responseHandler)
			{
				responseHandler(requestType, languageName, req.responseText);
			}
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
		languageIndex = languages.indexOf(languageName);
	details.url = homeUrl;
	details.name = languageName.toLowerCase()+'Movies';
	chrome.cookies.get(details, function(cookie){
		if(cookie)
		{
			moviesCookie = breakCookieString(cookie.value);
		}
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
					newMoviesCnt[languages.indexOf(languageName)]++;
					movieObjArray[i].isNew = true;
				}
			}	
		}
		langsChecked[languageIndex] = 1;
	});
}

function fireNotification()
{
	if(sumUpArray(langsChecked) == languages.length)
	{
		isDataReady = true;
		setBadge();
	}
	else
	{
		setTimeout(fireNotification, 1000);
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
	var refreshTimeVal = parseInt(localStorage.getItem("refreshTimeVal")),
		refreshTimeUnit = localStorage.getItem("refreshTimeUnit"),
		refreshInterval = 0;
	if(!refreshTimeVal || !refreshTimeUnit)
	{
		refreshInterval = REFRESH_INTERVAL;
		localStorage.setItem('refreshTimeVal','3');
		localStorage.setItem('refreshTimeUnit','Hours');
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
	var index = languages.indexOf(language),
		movieList = fetchedTitles[index];
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
		chrome.browserAction.setBadgeText({"text":"".toString()});//248,148,6
		chrome.browserAction.setBadgeBackgroundColor({"color":[128,0,0,0]});		
	}
}

chrome.extension.onRequest.addListener(
	function(request, sender, sendResponse) {
		if (request.messageType == RESET_NEW_FLAGS)
		{
			if(request.language)
			{
				resetNewFlags(request.language);
				sendResponse({messageType: FLAGS_RESET, language:request.language});
			}
		}
		if(request.messageType == INITIATE_AFRESH)
		{
			initiate();
		}	
	});