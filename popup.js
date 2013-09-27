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
	object.numAttempts = 0;
	object.PopupRenderManager = new PopupRenderManager();
	object.PopupInteractionManager = new PopupInteractionManager();
	object.SearchManager = new SearchManager();
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
	renderObject.listViewHolder = document.getElementById('movieTitlesList').childNodes[0];
	renderObject.tileViewHolder = document.getElementById('movieTitlesTiles');
	renderObject.usedHolder = null;
	renderObject.unusedHolder = null;
	renderObject.selectedLanguage = null;
	renderObject.dataSource = null;
	if(!renderObject.viewStyle)
	{
		renderObject.viewStyle = backgroundPage.CONSTANTS.DEFAULT_VIEW_STYLE;
		backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_PREF, backgroundPage.CONSTANTS.DEFAULT_VIEW_STYLE);
	}
	renderObject.initRender = function()
	{
		if(chrome.extension.getBackgroundPage().isDataReady)
		{
			var startLang, languages, selControl;
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
			selControl = startLang.toLowerCase()+"Button";
			$("#"+selControl).trigger("click");
			popupObject.PopupRenderManager.renderToolsBar();
			popupObject.PopupRenderManager.renderSearchBar();
			$(".icon-cog").css('display','block');
			$(".icon-search").css('display','block');
		}
		else
		{
			popupObject.PopupRenderManager.showProgressIndicator();
			if(popupObject.numAttempts++ < 15)
				setTimeout(popupObject.PopupRenderManager.initRender, 1000);
			else
				popupObject.PopupRenderManager.showProgressFailure();
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
		popupObject.PopupRenderManager.selectedLanguage = language;
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
	renderObject.deselectLanguageControl = function()
	{
		var langButton = document.getElementById(this.selectedLanguage.toLowerCase()+"Button");
		if(langButton)
		{
			langButton.setAttribute('class','btn btn-inverse');
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
	renderObject.renderMovieItems = function(movieItemsSource)
	{
		if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			popupObject.PopupRenderManager.listViewHolder.parentNode.style.opacity = 0.0;
		}
		else
		{
			popupObject.PopupRenderManager.tileViewHolder.style.opacity = 0.0;
		}
		setTimeout(function(){popupObject.PopupRenderManager.renderDataSource(movieItemsSource);},250);
	}
	renderObject.switchViewStyle = function()
	{
		this.renderMovieItems();
	}
	renderObject.renderDataSource = function(movieItemsSource)
	{
		var titleTable,
			movieObjects = popupObject.PopupRenderManager.dataSource;
		if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			titleTable = popupObject.PopupRenderManager.listViewHolder.parentNode;
			popupObject.PopupRenderManager.usedHolder = popupObject.PopupRenderManager.listViewHolder;
			popupObject.PopupRenderManager.unusedHolder = popupObject.PopupRenderManager.tileViewHolder;
		}
		else
		{
			titleTable = popupObject.PopupRenderManager.tileViewHolder;
			popupObject.PopupRenderManager.usedHolder = titleTable;
			popupObject.PopupRenderManager.unusedHolder = popupObject.PopupRenderManager.listViewHolder;
		}
		popupObject.PopupRenderManager.usedHolder.innerHTML = "";  //Removing all other names
		popupObject.PopupRenderManager.unusedHolder.innerHTML = "";
		for(i=0; i<movieObjects.length; i++)
		{
			popupObject.PopupRenderManager.addMovieItemToRenderedList(movieObjects[i]);
		} 
		titleTable.style.opacity = 1.0;
		if(movieItemsSource == "latest")
		{
			var language = popupObject.PopupRenderManager.selectedLanguage;
			if(language)
			{
				if(backgroundPage.newMoviesCnt[backgroundPage.backgroundObject.ContentManager.getLanguageIndex(language)]>0)
				{	
					backgroundPage.backgroundObject.CookieManager.setCookie(language.toLowerCase(),popupObject.PopupRenderManager.dataSource);
					sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS, language);
				}	
			}
		}
	}
	renderObject.addMovieItemToRenderedList = function(movieObject)
	{
		var movieTitle = movieObject.movieTitle;
			movieCover = movieObject.movieCover;
			movieDetails = movieObject.movieDetails;
		popupObject.PopupRenderManager.usedHolder.appendChild(this.createMovieItem(movieTitle, movieObject.isNew, movieCover, movieObject.watchURL, movieDetails));
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
		td.style.minWidth = "355px";
		tr.appendChild(td);
		tr.style.cursor = 'pointer';
		clickHandler = popupObject.PopupInteractionManager.getMovieRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+watchURL);
		tr.addEventListener('click',clickHandler);
		return tr;
	}
	renderObject.formatMovieDescription = function(description)
	{
		var detailsString = "Starring", directorString = "Directed by", musicString = "Music by",
			castIndex = description.indexOf(detailsString),
			directorIndex = description.indexOf(directorString),
			musicIndex = description.indexOf(musicString),
			castValue="",directorValue="",musicValue="",formattedDescription="";
		castValue = description.substring(castIndex+detailsString.length, directorIndex);
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
	renderObject.showProgressFailure = function()
	{
		$("#progressIndicatorDiv").css('display','none');
		$("#progressFail").css('display','block');
	}
	renderObject.showAlertBox = function(message)
	{
		$("#alertTextHolder").text(message);
		$("#alertBox").css({'opacity':'1','pointer-events':'all'});
	}
	renderObject.dismissAlertBox = function()
	{
		$("#alertBox").css({'opacity':'0','pointer-events':'none'});
	}
	return renderObject;
}

function PopupInteractionManager()
{
	var interactionObject = new Object();
	interactionObject.languageControlClickHandler = function(control)
	{
		var language = control.childNodes[0].nodeValue;
		popupObject.SearchManager.abortSearch();
		popupObject.PopupRenderManager.renderSelectedLanguageControl(language);
		popupObject.PopupRenderManager.dataSource = backgroundPage.backgroundObject.ContentManager.getMoviesData(language);
		popupObject.PopupRenderManager.renderMovieItems("latest");
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
			$("#searchTerm").trigger("focus");	
		});
		$("#removeTopBar").click(function(){
			$('#searchDiv').css('top','-36px');
			$('#searchDiv').css('opacity','0');
			$('.icon-search').css('opacity','1');
		});
		$("#searchTerm").focus(function(){
			if($("#searchTerm").val().indexOf("Search "+ popupObject.PopupRenderManager.selectedLanguage+" Movies") != -1 )
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
			
		});
		$("#searchForm").submit( function (event) {
		  popupObject.SearchManager.initiateSearch();    
          event.preventDefault();
          if($("#searchTerm").val() == "Search "+popupObject.PopupRenderManager.selectedLanguage+" Movies")
          {
          	$("#searchTerm").val("");
          }
          popupObject.SearchManager.sendSearchRequest("1"); 
        });
        $("#dismissAlertBox").click(function()
        {
        	popupObject.PopupRenderManager.dismissAlertBox();
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
			if($("#infoPanel").css('opacity') == '1')
				$("#dismissInfoPanel").trigger("click");		
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
		$(".icon-wrench").click(function()
		{
			chrome.tabs.create({url:"options.html"});
		});
		$("#dismissInfoPanel").click(function()
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
			if(popupObject.PopupRenderManager.viewStyle != backgroundPage.CONSTANTS.TILE_VIEW_STYLE)
			{
				popupObject.PopupRenderManager.viewStyle = backgroundPage.CONSTANTS.TILE_VIEW_STYLE;
				backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_PREF, backgroundPage.CONSTANTS.TILE_VIEW_STYLE);
				popupObject.PopupRenderManager.switchViewStyle();	
			}
			
		})
		$("#listView").click(function()
		{
			if(popupObject.PopupRenderManager.viewStyle != backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
			{	
				popupObject.PopupRenderManager.viewStyle = backgroundPage.CONSTANTS.LIST_VIEW_STYLE;
				backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_PREF, backgroundPage.CONSTANTS.LIST_VIEW_STYLE);
				popupObject.PopupRenderManager.switchViewStyle();
			}
		})
	}
	return interactionObject;
}

function SearchManager()
{
	var searchObject = new Object();
	searchObject.request = null;
	searchObject.searchUrl = "http://www.einthusan.com/webservice/filters.php";
	searchObject.movieDataUrl = "http://www.einthusan.com/webservice/movie.php?id=";
	searchObject.initiateSearch = function()
	{
		this.abortSearch();
		popupObject.PopupRenderManager.dataSource = [];
	}
	searchObject.abortSearch = function()
	{
		if(this.request)
		{
			this.request.abort();

		}
	}
	searchObject.sendSearchRequest = function(page)
	{
		$("#searchPage").val(page);
		this.request = $.post(this.searchUrl, $("#searchForm").serialize(), function(data,textStatus, xhr){
	
              	popupObject.SearchManager.processSearchResponse(data, xhr);
            }
          ).fail(function(jqXHR, textStatus, errorThrown){
     		if(errorThrown != "abort")
          		popupObject.PopupRenderManager.showAlertBox("Something went wrong.")
          });
	}
	searchObject.processSearchResponse = function(data, xhr)
	{
		data = jQuery.parseJSON(data);
		if(data && data.found > 0)
		{
			if(data.page == 1)
			{
				popupObject.PopupRenderManager.renderMovieItems("search");
				popupObject.PopupRenderManager.deselectLanguageControl();
			}
			for(i=0; i<data.results.length; i++)
			{
				$.get(popupObject.SearchManager.movieDataUrl+data.results[i], (function(req){
				  	return function(data){
								popupObject.SearchManager.processMovieData(data, req);
							}
				})(xhr));
			}
			if(data.max_page > 1 && data.page<data.max_page)
			{
				popupObject.SearchManager.sendSearchRequest(data.page+1);
			}
		}
		else
		{
			if(!data || data.error || data.error == "No Results Found")
			{
				popupObject.PopupRenderManager.showAlertBox("No movies found.");
			}
		}
	}
	searchObject.processMovieData = function(data, xhr)
	{
		if(xhr == popupObject.SearchManager.request)
		{
			data = $.parseJSON(data);
			var mo = popupObject.SearchManager.MovieObject(data.movie_id, data.movie, data.language, data.cover, this.collateMovieDetails(data));
			popupObject.PopupRenderManager.dataSource.push(mo);

			popupObject.PopupRenderManager.addMovieItemToRenderedList(mo);	
		}
	}
	searchObject.collateMovieDetails = function(data)
	{
		var cast = new Array();
		for(i=1; i<=7; i++)
		{
			if(data["cast"+i])
				cast.push(data["cast"+i]);
			else
				break;
		}
		var detailsStr="Starring ";
		for(i=0; i<cast.length; i++)
		{
			detailsStr = detailsStr + cast[i];
			if(i==cast.length-2)
				detailsStr = detailsStr + " and ";
			else if(i<cast.length-1)
				detailsStr = detailsStr + ", ";
		}
		detailsStr = detailsStr +". Directed by "+data.director+". Music by "+data.composer+".";
		return detailsStr;
	}
	searchObject.MovieObject = function(id, title, language, coverSrc, details)
	{
		var mo =  new Object();
		mo.movieTitle = title;
		mo.movieCover = "images/covers/"+coverSrc;
		mo.movieDetails = details;
		mo.watchURL = "/movies/watch.php?"+language.toLowerCase()+"moviesonline="+title+"&lang="+language.toLowerCase()+"&id="+id;
		mo.isNew = false;
		return mo;
	}
	return searchObject;
}