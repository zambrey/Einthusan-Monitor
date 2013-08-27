var homeUrl = "http://www.einthusan.com/";
var languages;
var favoriteLang;
var cookieValidDuration = 1000*60*60*24*30*12;

// function startDisplay()
{
	requestData('languages');
}

function getMovieTitles(button)
{
	var languageName = button.innerText;
	getMoviesForLanguage(languageName);
}

function getMoviesForLanguage(languageName)
{
	document.getElementById(languageName.toLowerCase()+"Button").setAttribute('class','btn btn-success');
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
	requestData(languageName);
}

function displayMovieTitles(movieObjects)
{
	var titleTable = document.getElementById('movieTitles');
	titleTable.innerHTML = '';  //Removing all other names
	var tbody = document.createElement('tbody');
	for(i=0; i<movieObjects.length; i++)
	{
		var movieTitle = movieObjects[i].movieTitle;
		var movieCover = movieObjects[i].movieCover;
		var tr = document.createElement('tr');
		if(movieObjects[i].isNew)
		{
			tr.setAttribute('class','info');
		}
		var td = document.createElement('td');
		var indexTd = document.createElement('td');
		var coverTd = document.createElement('td');
		var cover = document.createElement('img');
		cover.setAttribute('src',homeUrl+movieCover);
		cover.setAttribute('style','height:56px');
		cover.setAttribute('class','img-rounded');
		coverTd.appendChild(cover);
		indexTd.innerText = i+1+".";
		var nameDiv = document.createElement('div');
		nameDiv.innerHTML = movieTitle;
		td.appendChild(nameDiv);
		//tr.appendChild(indexTd);
		tr.appendChild(coverTd);
		tr.appendChild(td);
		tr.style.cursor = 'pointer';
		var clickHandler = getClickHandler(homeUrl+movieObjects[i].watchURL);
		tr.addEventListener('click',clickHandler);
		tbody.appendChild(tr);
	}   
	titleTable.appendChild(tbody);
}

function getClickHandler(watchURL)
{
	return function()
	{
		chrome.tabs.create({"url":watchURL},function(){});
	}
}

function displayLanguageButtons(languages)
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

function setCookie(languageName, movieObjects)
{
	var details = new Object();
	details.url = homeUrl;
	details.name = languageName.toLowerCase()+'Movies';
	details.value = buildCookieString(movieObjects);
	details.expirationDate = (new Date().getTime()/1000) + cookieValidDuration;
	chrome.cookies.remove({"url":homeUrl,"name":details.name});
	chrome.cookies.set(details);
}

function buildCookieString(movieObjects)
{
	var cookieString = '';
	for(i=0; i<movieObjects.length; i++)
	{
		cookieString = cookieString.concat(movieObjects[i].movieTitle);
		if(i<movieObjects.length-1)
		{
			cookieString = cookieString.concat('--');
		}
	}
	return cookieString;
}

// document.addEventListener('DOMContentLoaded', function () {
//   document.getElementById('click').addEventListener('click', startDisplay);
// });

function requestData(dataType)
{
	chrome.extension.sendRequest({requestType: dataType}, function(response){
		if(dataType == 'languages')
		{
			languages = response.list;
			favoriteLang = languages[0];
			displayLanguageButtons(response.list);
			getMoviesForLanguage(favoriteLang);
		}
		else
		{
			displayMovieTitles(response.list);
			setCookie(dataType.toLowerCase(), response.list);
		}
	});
}