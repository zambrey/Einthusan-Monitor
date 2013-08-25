var languages = new Array();
var fetchedTitles = new Array();
var done = 4, ok = 200;
var homeUrl = "http://www.einthusan.com/";
var queryPath = "index.php?lang=";
var favoriteLang = 'hindi';

//This part is run as soon as extension is started
/*
 * Fetches list of languages and presents corresponding buttons to fetch movie titles in those languages
 */
// function startIt()
{
	var request = new XMLHttpRequest();
	request.open("GET", homeUrl, true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	request.onreadystatechange = function() 
	{
		
		if (request.readyState == done && request.status == ok) 
		{
			if (request.responseText) 
			{
				var doc = document.implementation.createHTMLDocument("langs");
				doc.documentElement.innerHTML = request.responseText;
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
		}
	};
	request.send(); 
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
	var url = homeUrl+queryPath+languageName.toLowerCase()
	var request = new XMLHttpRequest();
	request.open("GET", url, true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	var movieTitles = new Array();
	var movieCoverSrc = new Array()
	request.onreadystatechange = function() 
	{
		if (request.readyState == done && request.status == ok) 
		{
			if (request.responseText) 
			{
				var doc = document.implementation.createHTMLDocument("Einthu");
				doc.documentElement.innerHTML = request.responseText;
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
	};
	request.send();
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

// document.addEventListener('DOMContentLoaded', function () {
//   document.getElementById('click').addEventListener('click', startIt);
// });
