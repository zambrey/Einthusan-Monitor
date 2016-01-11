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
	this.numAttempts = 0;
	this.PopupRenderManager = new PopupRenderManager();
	this.PopupInteractionManager = new PopupInteractionManager();
	this.SearchManager = new SearchManager();
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
		if(response.messageType == backgroundPage.CONSTANTS.IS_DATA_READY_RESPONSE)
		{
			if(response.status)
			{
				popupObject.PopupRenderManager.renderOnDataReady();
			}
			else
			{
				popupObject.PopupRenderManager.setTimeoutOnDataNotReady();
			}
		}
	});
}

function PopupRenderManager()
{
	backgroundPage.backgroundObject.LocalStorageManager.getLocalStorageValueForKey(backgroundPage.CONSTANTS.VIEW_STYLE_KEY, 
		function(keyAndData)
		{
			popupObject.PopupRenderManager.viewStyle = keyAndData['data'];
		});
	backgroundPage.backgroundObject.LocalStorageManager.getLocalStorageValueForKey(backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY, 
		function(keyAndData)
		{
			popupObject.PopupRenderManager.startLanguage = keyAndData['data'];
		});
	this.listViewHolder = document.getElementById('movieTitlesList').childNodes[0];
	this.tileViewHolder = document.getElementById('movieTitlesTiles');
	this.usedHolder = null;
	this.unusedHolder = null;
	this.selectedLanguage = null;
	this.dataSource = null;
	if(!this.viewStyle)
	{
		this.viewStyle = backgroundPage.CONSTANTS.DEFAULT_VIEW_STYLE;
		backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.VIEW_STYLE_KEY, backgroundPage.CONSTANTS.DEFAULT_VIEW_STYLE);
	}
	this.renderOnDataReady = function()
	{
		var startLang, languages, selControl;
		popupObject.PopupRenderManager.hideProgressIndicator();
		if(!backgroundPage)
		{
			backgroundPage = chrome.extension.getBackgroundPage();
		}
		languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
		popupObject.PopupRenderManager.renderLanguageControls(languages);
		startLang = popupObject.PopupRenderManager.startLanguage;
		if(!startLang)
		{
			startLang = languages[0];
			backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY, startLang);
		}
		selControl = startLang.toLowerCase()+"Button";
		$("#"+selControl).trigger("click");
		popupObject.PopupRenderManager.renderToolsBar();
		popupObject.PopupRenderManager.renderSearchBar();
		$(".glyphicon-cog").css('display','block');
		$(".glyphicon-search").css('display','block');
		if(this.viewStyle==backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			$("#listView").attr("active","true");
			$("#tileView").attr("active","false");
		}
		else
		{
			$("#listView").attr("active","false");
			$("#tileView").attr("active","true");
		}
	}
	this.setTimeoutOnDataNotReady = function()
	{
		popupObject.PopupRenderManager.showProgressIndicator();
		if(popupObject.numAttempts++ < 15)
			setTimeout(popupObject.PopupRenderManager.initRender, 1000);
		else
			popupObject.PopupRenderManager.showProgressFailure();
	}
	this.initRender = function()
	{
		sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
	}
	this.renderLanguageControls = function(languages)
	{
		if(!languages)
		{
			languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
		}
		var languagesTable = document.getElementById('languageButtons'),
			tr,
			buttons = [],
			lang,
			td,
			div,
			badge;
		if(languages.length>0 && languagesTable)
		{
			tr =document.createElement('tr');
			var caroDiv=document.createElement("div");
			$(caroDiv).addClass("item").addClass("active");
			for(i=0; i<languages.length; i++)
			{
				var button = document.createElement('button');
				button.setAttribute('class','btn');
				button.setAttribute('id',languages[i].toLowerCase()+"Button");
				button.innerHTML = languages[i];
				lang = languages[i];
				button.addEventListener('click',function(){popupObject.PopupInteractionManager.languageControlClickHandler(this);});
				button.setAttribute('style','margin:4px;');
				buttons.push(button);
				caroDiv.appendChild(button);
				if(caroDiv.children.length>=3 || i==languages.length-1)
				{
					$(caroDiv).appendTo($(".carousel-inner"));
					caroDiv=document.createElement("div");
					$(caroDiv).addClass("item");
				}
			}
			backgroundPage.backgroundObject.LocalStorageManager.getLocalStorageValueForKey(backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY, function(keyAndData){
				var notifLangs = keyAndData["data"];
				for(var j=0; j<languages.length;j++)
				{
					if(backgroundPage.newMoviesCnt[j]>0 && notifLangs[languages[j]])
					{
						popupObject.PopupRenderManager.addLanguageControlBadge(buttons[j],backgroundPage.newMoviesCnt[j]);
					}	
				}
			});
		}
		languagesTable.style.opacity = 1.0;
	}
	this.renderSelectedLanguageControl = function(language)
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
	this.deselectLanguageControl = function()
	{
		var langButton = document.getElementById(this.selectedLanguage.toLowerCase()+"Button");
		if(langButton)
		{
			langButton.setAttribute('class','btn btn-primary');
		}
	}
	this.addLanguageControlBadge = function(control, newMoviesNumber)
	{
		badge = document.createElement('span');
		badge.setAttribute('class','badge');
		badge.setAttribute('style','position:absolute; top:22px; background:orangered; color:white;');
		badge.innerText = newMoviesNumber;
		control.appendChild(badge);
	}
	this.renderMovieItems = function(movieItemsSource)
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
	this.switchViewStyle = function()
	{
		this.renderMovieItems();
	}
	this.renderDataSource = function(movieItemsSource)
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
					backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(language.toLowerCase()+"Movies",backgroundPage.backgroundObject.LocalStorageManager.buildMovieNamesArray(popupObject.PopupRenderManager.dataSource));
					sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS, language);
				}
			}
		}
	}
	this.addMovieItemToRenderedList = function(movieObject)
	{
		var movieTitle = movieObject.movieTitle;
			movieCover = movieObject.movieCover;
			movieDetails = movieObject.movieDetails;
		popupObject.PopupRenderManager.usedHolder.appendChild(this.createMovieItem(movieTitle, movieObject.isNew, movieCover, movieObject.watchURL, movieDetails));
	}
	this.addMovieItemToRenderedListAtIndex = function(movieObject, index)
	{
		var movieTitle = movieObject.movieTitle;
			movieCover = movieObject.movieCover;
			movieDetails = movieObject.movieDetails;
		if(index == 0)
		{
			$('#movieTitlesList > tbody > tr').eq(0).before(this.createMovieItem(movieTitle, movieObject.isNew, movieCover, movieObject.watchURL, movieDetails));	
		}
		else
		{
			$('#movieTitlesList > tbody > tr').eq(index-1).after(this.createMovieItem(movieTitle, movieObject.isNew, movieCover, movieObject.watchURL, movieDetails));	
		}
	}
	this.createMovieItem = function(movieTitle, isNew, movieCover, watchURL, movieDetails)
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
	this.createMovieTile = function(movieTitle, isNew, movieCover, watchURL)
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
	this.createMovieListItem = function(movieTitle, isNew, movieCover, watchURL, movieDetails)
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
	this.formatMovieDescription = function(description)
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
	this.removeLanguageControlBadge = function(language)
	{
		var button = document.getElementById(language.toLowerCase()+"Button");
		if(button.lastElementChild && button.lastElementChild.className.indexOf("badge") >= 0)
		{
			button.lastElementChild.style.top = '0px';
			button.lastElementChild.style.opacity = 0;
		}
	}
	this.renderSearchBar = function()
	{
		popupObject.PopupInteractionManager.setTopBarInteraction();
	}
	this.renderToolsBar = function()
	{
		popupObject.PopupInteractionManager.setBottomBarInteraction();
	}
	this.hideProgressIndicator = function()
	{
		var pi = document.getElementById('progressIndicatorDiv');
		if(pi)
		{
			pi.style.display = 'none';
		}
	}
	this.showProgressIndicator = function()
	{
		var pi = document.getElementById('progressIndicatorDiv');
		if(pi)
		{
			pi.style.display = 'block';
		}
	}
	this.showProgressFailure = function()
	{
		$("#progressIndicatorDiv").css('display','none');
		$("#progressFail").css('display','block');
	}
	this.showAlertBox = function(message)
	{
		$("#alertTextHolder").text(message);
		$("#alertBox").css({'opacity':'1','pointer-events':'all'});
	}
	this.dismissAlertBox = function()
	{
		$("#alertBox").css({'opacity':'0','pointer-events':'none'});
	}
}

function PopupInteractionManager()
{
	this.languageControlClickHandler = function(control)
	{
		var language = control.childNodes[0].nodeValue;
		popupObject.SearchManager.abortSearch();
		popupObject.PopupRenderManager.renderSelectedLanguageControl(language);
		popupObject.PopupRenderManager.dataSource = backgroundPage.backgroundObject.ContentManager.getMoviesData(language);
		popupObject.PopupRenderManager.renderMovieItems("latest");
	}
	this.getMovieRowClickHandler = function(url)
	{
		return function()
		{
			chrome.tabs.create({"url":url},function(){});
		}
	}
	this.setTopBarInteraction = function()
	{
		$(".glyphicon-search").click(function(){
			$('#searchDiv').css('top','0');
			$('#searchDiv').css('opacity','1');
			$("#searchTerm").attr("placeholder","Search "+popupObject.PopupRenderManager.selectedLanguage+" Movies");
			$("#searchLang").val(popupObject.PopupRenderManager.selectedLanguage.toLowerCase());
			$(".glyphicon-search").css('opacity','0');
			$("#searchTerm").trigger("focus");
		});
		$("#removeTopBar").click(function(){
			$('#searchDiv').css('top','-36px');
			$('#searchDiv').css('opacity','0');
			$('.glyphicon-search').css('opacity','1');
		});
		$("#searchForm").submit( function (event) {
		  popupObject.SearchManager.initiateSearch();
          event.preventDefault();
          popupObject.SearchManager.sendSearchRequest("1");
        });
        $("#dismissAlertBox").click(function()
        {
        	popupObject.PopupRenderManager.dismissAlertBox();
        });
	}
	this.setBottomBarInteraction = function()
	{
		$(".glyphicon-cog").click(function()
		{
			$("#toolsPanel").css('top','0');
			$("#toolsPanel").css('opacity','1');
			$(".glyphicon-cog").css('opacity','0');
		});
		$("#removeBottomBar").click(function()
		{
			$("#toolsPanel").css('top','-36px');
			$("#toolsPanel").css('opacity','0');
			$(".glyphicon-cog").css('opacity','1');
			if($("#infoPanel").css('opacity') == '1')
				$("#dismissInfoPanel").trigger("click");
		});
		$(".glyphicon-info-sign").click(function()
		{
			$(".glyphicon-info-sign").toggleClass('icon-white');
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
		$(".glyphicon-wrench").click(function()
		{
			chrome.tabs.create({url:"options.html"});
		});
		$("#dismissInfoPanel").click(function()
		{
			$(".glyphicon-info-sign").toggleClass('icon-white');
			$("#infoPanel").css('opacity','0');
			$("#infoPanel").css('left','-362px');
		});
		$("#feedback").click(function()
		{
			chrome.tabs.create({"url":$("#feedback").attr('href')},function(){});
		});
		$("#homepage").click(function()
		{
			chrome.tabs.create({"url":$("#homepage").attr("href")},function(){});
		});
		$("#tileView").click(function()
		{
			if(popupObject.PopupRenderManager.viewStyle != backgroundPage.CONSTANTS.TILE_VIEW_STYLE)
			{
				popupObject.PopupRenderManager.viewStyle = backgroundPage.CONSTANTS.TILE_VIEW_STYLE;
				backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.VIEW_STYLE_KEY, backgroundPage.CONSTANTS.TILE_VIEW_STYLE);
				popupObject.PopupRenderManager.switchViewStyle();
				$("#listView").attr("active","false");
				$("#tileView").attr("active","true");
			}

		})
		$("#listView").click(function()
		{
			if(popupObject.PopupRenderManager.viewStyle != backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
			{
				popupObject.PopupRenderManager.viewStyle = backgroundPage.CONSTANTS.LIST_VIEW_STYLE;
				backgroundPage.backgroundObject.LocalStorageManager.setLocalStorageValueForKey(backgroundPage.CONSTANTS.VIEW_STYLE_KEY, backgroundPage.CONSTANTS.LIST_VIEW_STYLE);
				popupObject.PopupRenderManager.switchViewStyle();
				$("#listView").attr("active","true");
				$("#tileView").attr("active","false");
			}
		})
	}
}

function SearchManager()
{
	this.requests = new Array();
	this.searchUrl = "http://www.einthusan.com/webservice/filters.php";
	this.movieDataUrl = "http://www.einthusan.com/webservice/movie.php?id=";
	this.initiateSearch = function()
	{
		this.abortSearch();
		popupObject.PopupRenderManager.dataSource = [];
	}
	this.abortSearch = function()
	{
		if(this.requests.length > 0)
		{
			for(i=0; i<this.requests.length; i++)
			{
				this.requests[i].abort();
			}
		}
		this.requests = [];
	}
	this.sendSearchRequest = function(page)
	{
		$("#searchPage").val(page);
		var request = $.post(this.searchUrl, $("#searchForm").serialize(), function(data,textStatus, xhr){
			popupObject.SearchManager.processSearchResponse(data, xhr);
		}
          ).fail(function(jqXHR, textStatus, errorThrown){
     		if(errorThrown != "abort")
          		popupObject.PopupRenderManager.showAlertBox("Something went wrong.")
          });
          this.requests.push(request);
	}
	this.processSearchResponse = function(data, xhr)
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
	this.processMovieData = function(data, xhr)
	{
		//check if request is in the array anywhere
		if(popupObject.SearchManager.requests.indexOf(xhr) != -1 )
		{
			data = $.parseJSON(data);
			var mo = popupObject.SearchManager.MovieObject(data.movie_id, data.movie, data.language, data.cover, this.collateMovieDetails(data));
			
			var index = this.findPositionToInsertMO(mo.movieTitle);
			popupObject.PopupRenderManager.dataSource.insert(index, mo);
			popupObject.PopupRenderManager.addMovieItemToRenderedListAtIndex(mo, index);
		}
	}
	this.printDataSource = function(ds)
	{
		for(var i=0;i<ds.length; i++)
		{
			console.log(i+": "+ds[i].movieTitle);
		}
	}
	this.findPositionToInsertMO = function(title)
	{
		var moviesArray = popupObject.PopupRenderManager.dataSource,
			low = 0,
			high = moviesArray.length-1,
			mid, currMidTitle, compareVal;
		
		if(moviesArray.length == 0)
		{
			return low;
		}
		while(high>=low)
		{
			mid = Math.floor((low+high)/2);
			currMidTitle = moviesArray[mid].movieTitle;
			compareVal = title.localeCompare(currMidTitle);
			if(compareVal<0)
			{
				high = mid-1;
			}
			else if(compareVal>0)
			{
				low = mid+1;
			}
		}
		return compareVal<0?mid:mid+1;
	}
	this.collateMovieDetails = function(data)
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
	this.MovieObject = function(id, title, language, coverSrc, details)
	{
		var mo =  new Object();
		mo.movieTitle = title;
		mo.movieCover = "images/covers/"+coverSrc;
		mo.movieDetails = details;
		mo.watchURL = "/movies/watch.php?"+language.toLowerCase()+"moviesonline="+title+"&lang="+language.toLowerCase()+"&id="+id;
		mo.isNew = false;
		return mo;
	}
}

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};
