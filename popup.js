var languages = new Array();
var fetchedTitles = new Array();
var done = 4, ok = 200;
var homeUrl = "http://www.einthusan.com/";
var queryPath = "index.php?lang=";
var favoriteLang = 'hindi';

var LANGUAGE_REQUEST_CONST = "languageRequest";
var MOVIES_REQUEST_CONST = "moviesRequest";

// function startIt()
{
	sendXMLRequest(homeUrl, LANGUAGE_REQUEST_CONST, null);
}

function getMovieTitles(button)
{
	var languageName = button.innerText;
	button.setAttribute('class','btn btn-success');
	for(i=0; i<languages.length; i++)
	{
		var langButton = document.getElementById(languages[i].toLowerCase()+"Button");
		if(languages[i] == languageName)
		{
			langButton.setAttribute('class','btn btn-success');
		}
		else
		{
			langButton.setAttribute('class','btn');
		}
	}
	/*if(fetchedTitles[languages.indexOf(languageName)])
	{
		displayMovieTitles(fetchedTitles[languages.indexOf(languageName)]);
		return;
	}*/
	getMovieTitlesForLanguage(languageName);
}

function getMovieTitlesForLanguage(languageName)
{
	sendXMLRequest(homeUrl+queryPath+languageName.toLowerCase(), MOVIES_REQUEST_CONST, languageName);
}

function capitaliseFirstLetter(string)
{
	return string.charAt(0).toUpperCase() + string.slice(1);
}

function displayMovieTitles(movieTitles, movieCovers)
{
	var titleTable = document.getElementById('movieTitles');
	titleTable.innerHTML = '';  //Removing all other names
	for(i=0; i<movieTitles.length; i++)
	{
		var tr = document.createElement('tr');
		var td = document.createElement('td');
		var indexTd = document.createElement('td');
		var coverTd = document.createElement('td');
		var cover = document.createElement('img');
		cover.setAttribute('src',homeUrl+movieCovers[i]);
		cover.setAttribute('style','height:56px');
		cover.setAttribute('class','img-rounded');
		coverTd.appendChild(cover);
		indexTd.innerText = i+1+".";
		var nameDiv = document.createElement('div');
		nameDiv.innerHTML = movieTitles[i];
		td.appendChild(nameDiv);
		//tr.appendChild(indexTd);
		tr.appendChild(coverTd);
		tr.appendChild(td);
		titleTable.appendChild(tr);
	}      
}

function displayLanguageButtons()
{
	var languagesTable = document.getElementById('languageButtons');
	if(languages.length>0 && languagesTable)
	{
		var tr =document.createElement('tr');
		for(i=0; i<languages.length; i++)
		{
			var button = document.createElement('button');
			button.setAttribute('class','btn');
			button.setAttribute('id',languages[i].toLowerCase()+"Button");
			button.innerHTML = languages[i];
			var lang = languages[i];
			button.addEventListener('click',function(){getMovieTitles(this);});
			var td = document.createElement('td');
			td.appendChild(button);
			tr.appendChild(td);
		}
		languagesTable.appendChild(tr);
	}
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
		var doc = document.implementation.createHTMLDocument("languages");
		doc.documentElement.innerHTML = responseText;
		var langs = doc.getElementsByTagName('li');
		for(i=0; i<langs.length; i++)
		{
			langName = langs[i].firstChild.innerHTML;
			languages.push(langName);
		}
		fetchedTitles.length = languages.length;
		displayLanguageButtons();
		getMovieTitlesForLanguage(favoriteLang);
		document.getElementById(favoriteLang+"Button").setAttribute('class','btn btn-success');
	}
	else if(requestType == MOVIES_REQUEST_CONST)
	{	
		var movieTitles = new Array();
		var movieCoverSrc = new Array();
		var doc = document.implementation.createHTMLDocument("movies");
		doc.documentElement.innerHTML = responseText;
		var movieElems = doc.getElementsByClassName("movie-title");
		var movieCovers = doc.getElementsByClassName("movie-cover-wrapper");
		for(i=0; i<movieElems.length; i++)
		{
			movieTitles.push(movieElems[i].innerHTML.split(' - ')[0]);
			movieCoverSrc.push(movieCovers[i].firstChild.getAttribute('src'));
		}
		displayMovieTitles(movieTitles,movieCoverSrc);
		fetchedTitles[languages.indexOf(capitaliseFirstLetter(languageName))] = movieTitles;
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

// document.addEventListener('DOMContentLoaded', function () {
//   document.getElementById('click').addEventListener('click', startIt);
// });
