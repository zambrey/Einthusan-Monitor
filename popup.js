var homeUrl = "http://www.einthusan.com/";
var languages;
var cookieValidDuration = 60*60*24*30*12;
var backgroundPage = null;

{
	setTimeout(render, 50);
	window.onclose = function(){alert('window closed')};
}

function render()
{
	if(chrome.extension.getBackgroundPage().isDataReady)
	{
		var pi = document.getElementById('progressIndicatorDiv');
		pi.style.display = 'none';
		backgroundPage = chrome.extension.getBackgroundPage();
		languages = backgroundPage.languages;
		displayLanguageButtons(languages);
		getMoviesForLanguage(languages[0]);
	}
	else
	{
		var pi = document.getElementById('progressIndicatorDiv');
		pi.style.display = 'block';
		setTimeout(render, 200);
	}
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
	var index = languages.indexOf(languageName);
	var movieList = backgroundPage.fetchedTitles[index];
	displayMovieTitles(movieList);
	setCookie(languageName.toLowerCase(), movieList);
	if(backgroundPage.newMoviesCnt[index]>0)
	{	
		sendMessage(backgroundPage.RESET_NEW_FLAGS, languageName);
	}
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
			td.setAttribute('style','border-top:none;');
			var div = document.createElement('div');
			div.setAttribute('style','position:relative;');
			div.appendChild(button);
			if(backgroundPage.newMoviesCnt[i]>0)
			{
				var badge = document.createElement('span');
				badge.setAttribute('class','badge badge-warning');
				badge.setAttribute('style','position:absolute; right:-8px;top:-8px;');
				badge.innerText = backgroundPage.newMoviesCnt[i];	
				div.appendChild(badge);
			}
			td.appendChild(div);
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

function sendMessage(msgType, languageName)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	if(msgType == backgroundPage.RESET_NEW_FLAGS)
	{
		msgObject.language = languageName;
	}
	chrome.extension.sendRequest(msgObject, function(response){
		if(response.messageType == backgroundPage.FLAGS_RESET)
		{
			updateButtonBadge(languageName);
		}
	});
}

function updateButtonBadge(languageName)
{
	var button = document.getElementById(languageName.toLowerCase()+"Button");
	button.parentNode.removeChild(button.parentNode.lastChild);
	/*var titleTable = document.getElementById('movieTitles').firstChild;
	for(i=0; i < titleTable.children.length; i++)
	{
		titleTable.children[i].removeAttribute('class');
	}*/
}