/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	popupObject = new PopupObject();

{
	setTimeout(popupObject.PopupRenderManager.initRender, 50);
}

function PopupObject()
{
	var object = new Object();
	object.PopupRenderManager = new PopupRenderManager();
	object.PopupInteractionManager = new PopupInteractionManager();
	return object;
}

function sendMessage(msgType, languageName)
{
	var msgObject = new Object();
	msgObject.messageType = msgType;
	if(msgType == backgroundPage.CONSTANTS.RESET_NEW_FLAGS)
	{
		msgObject.language = languageName;
	}
	chrome.extension.sendRequest(msgObject, function(response){
		if(response.messageType == backgroundPage.CONSTANTS.NEW_FLAGS_RESET_DONE)
		{
			popupObject.PopupRenderManager.removeLanguageControlBadge(languageName);
		}
	});
}

function PopupRenderManager()
{
	var renderObject = new Object();
	renderObject.viewStyle = backgroundPage.backgroundObject.PreferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_PREF);
	if(!renderObject.viewStyle)
	{
		renderObject.viewStyle = backgroundPage.CONSTANTS.DEFAULT_VIEW_STYLE;
		backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_PREF, backgroundPage.CONSTANTS.DEFAULT_VIEW_STYLE);
	}
	renderObject.selectedLanguage = null;
	renderObject.initRender = function()
	{
		if(chrome.extension.getBackgroundPage().isDataReady)
		{
			var startLang, languages;
			popupObject.PopupRenderManager.hideProgressIndicator();
			if(!backgroundPage)
			{
				backgroundPage = chrome.extension.getBackgroundPage();	
			}
			languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
			popupObject.PopupRenderManager.renderLanguageControls(languages);
			startLang = backgroundPage.backgroundObject.PreferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.DEF_LANG_PREF);
			if(!startLang)
			{
				startLang = languages[0];
				backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.DEF_LANG_PREF, startLang);
			}
			popupObject.PopupRenderManager.renderMoviesForLanguage(startLang);
			popupObject.PopupRenderManager.renderToolsBar();
			popupObject.PopupRenderManager.renderSearchBar();
		}
		else
		{
			popupObject.PopupRenderManager.showProgressIndicator();
			setTimeout(popupObject.PopupRenderManager.initRender, 200);
		}
	}
	renderObject.renderLanguageControls = function(languages)
	{
		if(!languages)
		{
			languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
		}
		var languagesTable = document.getElementById('languageButtons'),
			tr,
			button,
			lang,
			td,
			div,
			badge;
		if(languages.length>0 && languagesTable)
		{
			tr =document.createElement('tr');
			for(i=0; i<languages.length; i++)
			{
				button = document.createElement('button');
				button.setAttribute('class','btn');
				button.setAttribute('id',languages[i].toLowerCase()+"Button");
				button.innerHTML = languages[i];
				lang = languages[i];
				button.addEventListener('click',function(){popupObject.PopupInteractionManager.languageControlClickHandler(this);});
				if(backgroundPage.newMoviesCnt[i]>0)
				{
					this.addLanguageControlBadge(button,backgroundPage.newMoviesCnt[i]);
				}
				button.setAttribute('style','margin:4px;');
				languagesTable.appendChild(button);
			}
		}
		languagesTable.style.opacity = 1.0;
	}
	renderObject.renderSelectedLanguageControl = function(language)
	{
		var languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
		for(i=0; i<languages.length; i++)
		{
			var langButton = document.getElementById(languages[i].toLowerCase()+"Button");
			if(languages[i] == language)
			{
				langButton.setAttribute('class','btn btn-success');
			}
			else
			{
				langButton.setAttribute('class','btn');
			}
		}
	}
	renderObject.addLanguageControlBadge = function(control, newMoviesNumber)
	{
		badge = document.createElement('span');
		badge.setAttribute('class','badge badge-warning');
		badge.setAttribute('style','position:absolute; top:25px;');
		badge.innerText = newMoviesNumber;	
		control.appendChild(badge);
	}
	renderObject.renderMoviesForLanguage = function(language)
	{
		popupObject.PopupRenderManager.selectedLanguage = language;
		var languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
		popupObject.PopupRenderManager.renderSelectedLanguageControl(language);
		var index = languages.indexOf(language),
			movieList = backgroundPage.backgroundObject.ContentManager.getMoviesData(language);
		if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			document.getElementById('movieTitlesList').style.opacity = 0.0;
		}
		else
		{
			document.getElementById('movieTitlesTiles').style.opacity = 0.0;
		}
		setTimeout(function(){popupObject.PopupRenderManager.renderMoviesTable(movieList, language);},250);
	}
	renderObject.renderMoviesTable = function(movieObjects, language)
	{
		var titleTable,
			usedDOM,
			unusedDOM,
			movieTitle,
			movieCover,
			movieDetails;
		if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			titleTable = document.getElementById('movieTitlesList');
			titleTable.appendChild(document.createElement('tbody'));
			usedDOM = titleTable.children[0];
			unusedDOM = document.getElementById('movieTitlesTiles');
		}
		else
		{
			titleTable = document.getElementById('movieTitlesTiles');
			usedDOM = titleTable;
			unusedDOM = document.getElementById('movieTitlesList');
		}
		usedDOM.innerHTML = "";  //Removing all other names
		unusedDOM.innerHTML = "";
		for(i=0; i<movieObjects.length; i++)
		{
			movieTitle = movieObjects[i].movieTitle;
			movieCover = movieObjects[i].movieCover;
			movieDetails = movieObjects[i].movieDetails;
			usedDOM.appendChild(this.createMovieItem(movieTitle, movieObjects[i].isNew, movieCover, movieObjects[i].watchURL, movieDetails));
		} 
		titleTable.style.opacity = 1.0;
		if(language)
		{
			backgroundPage.backgroundObject.CookieManager.setCookie(language.toLowerCase(),movieObjects);
			if(backgroundPage.newMoviesCnt[backgroundPage.backgroundObject.ContentManager.getLanguageIndex(language)]>0)
			{	
				sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS, language);
			}	
		}
	}
	renderObject.createMovieItem = function(movieTitle, isNew, movieCover, watchURL, movieDetails)
	{
		var item;
		if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			item = this.createMovieListItem(movieTitle, isNew, movieCover, watchURL, movieDetails);
		}
		else
		{
			item = this.createMovieTile(movieTitle, isNew, movieCover, watchURL);
		}
		return item;
	}
	renderObject.createMovieTile = function(movieTitle, isNew, movieCover, watchURL)
	{
		var div = document.createElement('div');
		div.setAttribute('title',movieTitle);
		div.setAttribute('class','movieTile');
		if(isNew)
		{
			div.style.backgroundColor = "#fcf8e3";
		}
		cover = document.createElement('img');
		cover.setAttribute('src',backgroundPage.CONSTANTS.HOME_URL+movieCover);
		cover.setAttribute('class','tileMovieCover');
		nameDiv = document.createElement('div');
		nameDiv.innerHTML = movieTitle;
		nameDiv.setAttribute('class','tileMovieNameDiv');
		div.appendChild(cover);
		div.appendChild(nameDiv);
		clickHandler = popupObject.PopupInteractionManager.getMovieRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+watchURL);
		div.addEventListener('click',clickHandler);
		return div;
	}
	renderObject.createMovieListItem = function(movieTitle, isNew, movieCover, watchURL, movieDetails)
	{
		var tr = document.createElement('tr');
		if(isNew)
		{
			tr.setAttribute('class','warning');
		}
		var holderDiv = document.createElement('div');
		td = document.createElement('td');
		cover = document.createElement('img');
		cover.setAttribute('src',backgroundPage.CONSTANTS.HOME_URL+movieCover);
		cover.setAttribute('class','listMovieCover');
		nameDiv = document.createElement('div');
		nameDiv.innerHTML = movieTitle;
		nameDiv.setAttribute('class','movieNameDiv');
		descDiv = document.createElement('div');
		descDiv.innerHTML = this.formatMovieDescription(movieDetails);
		descDiv.setAttribute('class','movieDescDiv');
		holderDiv.appendChild(cover);
		holderDiv.appendChild(nameDiv);
		holderDiv.appendChild(descDiv);
		td.appendChild(holderDiv);
		tr.appendChild(td);
		tr.style.cursor = 'pointer';
		clickHandler = popupObject.PopupInteractionManager.getMovieRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+watchURL);
		tr.addEventListener('click',clickHandler);
		return tr;
	}
	renderObject.formatMovieDescription = function(description)
	{
		var castString = "Starring", directorString = "Directed by", musicString = "Music by",
			castIndex = description.indexOf(castString),
			directorIndex = description.indexOf(directorString),
			musicIndex = description.indexOf(musicString),
			castValue="",directorValue="",musicValue="",formattedDescription="";
		castValue = description.substring(castIndex+castString.length, directorIndex);
		directorValue = description.substring(directorIndex+directorString.length, musicIndex);
		musicValue = description.substring(musicIndex+musicString.length);
		formattedDescription = "<i>Cast:</i> "+castValue + "<br><i>Director:</i> "+ directorValue + "<br><i>Music:</i> " + musicValue;
		return formattedDescription;
	}
	renderObject.removeLanguageControlBadge = function(language)
	{
		var button = document.getElementById(language.toLowerCase()+"Button");
		button.lastChild.style.top = '0px';
		button.lastChild.style.opacity = 0;
	}
	renderObject.renderSearchBar = function()
	{
		popupObject.PopupInteractionManager.setTopBarInteraction();
	}
	renderObject.renderToolsBar = function()
	{
		popupObject.PopupInteractionManager.setBottomBarInteraction();
	}
	renderObject.hideProgressIndicator = function()
	{
		var pi = document.getElementById('progressIndicatorDiv');
		if(pi)
		{
			pi.style.display = 'none';	
		}
	}
	renderObject.showProgressIndicator = function()
	{
		var pi = document.getElementById('progressIndicatorDiv');
		if(pi)
		{
			pi.style.display = 'block';
		}
	}
	return renderObject;
}

function PopupInteractionManager()
{
	var interactionObject = new Object();
	interactionObject.languageControlClickHandler = function(control)
	{
		var language = control.childNodes[0].nodeValue;
		popupObject.PopupRenderManager.renderMoviesForLanguage(language);
	}
	interactionObject.getMovieRowClickHandler = function(url)
	{
		return function()
		{
			chrome.tabs.create({"url":url},function(){});
		}
	}
	interactionObject.setTopBarInteraction = function()
	{
		$(".icon-search").click(function(){
			$('#searchDiv').css('top','0');
			$('#searchDiv').css('opacity','1');
			$("#searchTerm").val("Search "+popupObject.PopupRenderManager.selectedLanguage+" Movies");
			$("#searchLang").val(popupObject.PopupRenderManager.selectedLanguage.toLowerCase());
			$("#searchTerm").css('color','#BBBBBB');
			$(".icon-search").css('opacity','0');
		});
		$("#removeTopBar").click(function(){
			$('#searchDiv').css('top','-36px');
			$('#searchDiv').css('opacity','0');
			$('.icon-search').css('opacity','1');
		});
		$("#searchTerm").focus(function(){
			$("#searchTerm").val("");
			$("#searchTerm").css('color','#000000');
		});
		$("#searchTerm").blur(function(){
			$("#searchTerm").css('color','#BBBBBB');
			if($("#searchTerm").val() == "")
			{
				$("#searchTerm").val("Search "+popupObject.PopupRenderManager.selectedLanguage+" Movies")
			}
		});
		$("#submitSearch").click(function(){
			$("#searchForm").submit( function () {    
              $.post(
               'http://www.einthusan.com/webservice/filters.php',
                $(this).serialize(),
                function(data){
                  populateSearchResults(jQuery.parseJSON(data));
                }
              );
              return false;   
            });
		});
		
	}
	interactionObject.setBottomBarInteraction = function()
	{
		$(".icon-cog").click(function()
		{
			$("#toolsPanel").css('top','0');
			$("#toolsPanel").css('opacity','1');
			$(".icon-cog").css('opacity','0');
		});
		$("#removeBottomBar").click(function()
		{
			$("#toolsPanel").css('top','-36px');
			$("#toolsPanel").css('opacity','0');
			$(".icon-cog").css('opacity','1');
		});
		$(".icon-info-sign").click(function()
		{
			$(".icon-info-sign").toggleClass('icon-white');
			if($("#infoPanel").css('opacity') == '0')
			{
				$("#infoPanel").css('opacity','1');
				$("#infoPanel").css('left','0');	
			}
			else
			{
				$("#infoPanel").css('opacity','0');
				$("#infoPanel").css('left','-362px');
			}
		});
		$(".close").click(function()
		{
			$(".icon-info-sign").toggleClass('icon-white');
			$("#infoPanel").css('opacity','0');
			$("#infoPanel").css('left','-362px');
		}); 
		$("#feedback").click(function()
		{
			chrome.tabs.create({"url":$("#feedback").attr('href')},function(){});
		});
		$("#tileView").click(function()
		{
			popupObject.PopupRenderManager.viewStyle = backgroundPage.CONSTANTS.TILE_VIEW_STYLE;
			backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_PREF, backgroundPage.CONSTANTS.TILE_VIEW_STYLE);
			popupObject.PopupRenderManager.renderMoviesForLanguage(popupObject.PopupRenderManager.selectedLanguage);
		})
		$("#listView").click(function()
		{
			popupObject.PopupRenderManager.viewStyle = backgroundPage.CONSTANTS.LIST_VIEW_STYLE;
			backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_PREF, backgroundPage.CONSTANTS.LIST_VIEW_STYLE);
			popupObject.PopupRenderManager.renderMoviesForLanguage(popupObject.PopupRenderManager.selectedLanguage);	
		})
	}
	return interactionObject;
}

function populateSearchResults(data)
{
	//alert(data);
	if(data.found > 0)
	{
		resultCountOnPage = Math.min(data.results_per_page, data.found);
		for(i=0; i<resultCountOnPage; i++)
		{
			console.log(data.results[i]);
			//Get the data using movie id here
			//e.g. http://www.einthusan.com/webservice/movie.php?id=1236
			//Populate some array with MovieObjects
			//Try to use same render function as above
		}
		if(data.max_page > 1)
		{
			//Save max_page and currentPage# value
			//send POST requests with page parameter
			//Do same this as above for the results there
			//Do lazy load i.e. fetch next page data only if asked
		}
	}
	else
	{
		//show No movies found message
		console.log("No movies found.");
	}
}