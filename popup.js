/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = chrome.extension.getBackgroundPage(),
	numAttempts = 0;
	renderManager = new PopupRenderManager();
	interactionManager = new PopupInteractionManager();

{
	setTimeout(renderManager.initRender, 10);
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
			renderManager.removeLanguageControlBadge(languageName);
		}
		if(response.messageType == backgroundPage.CONSTANTS.IS_DATA_READY_RESPONSE)
		{
			if(response.status)
			{
				renderManager.renderOnDataReady();
			}
			else
			{
				renderManager.setTimeoutOnDataNotReady();
			}
		}
	});
}

function PopupRenderManager()
{
	this.listViewHolder = document.getElementById('movieTitlesList').childNodes[0];
	this.tileViewHolder = document.getElementById('movieTitlesTiles');
	this.usedHolder = null;
	this.unusedHolder = null;
	this.selectedLanguage = null;
	this.dataSource = null;

	this.renderOnDataReady = function()
	{
		var startLang, languages, selControl;
		renderManager.hideProgressIndicator();
		if(!backgroundPage)
		{
			backgroundPage = chrome.extension.getBackgroundPage();
		}
		languages = backgroundPage.contentManager.getLanguagesData();
		renderManager.renderLanguageControls(languages);
		startLang = backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.DEFAULT_LANGUAGE_KEY];
		selControl = startLang.toLowerCase()+"Button";
		$("#"+selControl).trigger("click");
		renderManager.renderToolsBar();
		$(".glyphicon-cog").css('display','block');
		if(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.VIEW_STYLE_KEY] == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
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
		renderManager.showProgressIndicator();
		if(numAttempts++ < 15)
			setTimeout(renderManager.initRender, 1000);
		else
			renderManager.showProgressFailure();
	}

	this.initRender = function()
	{
		sendMessage(backgroundPage.CONSTANTS.IS_DATA_READY_QUERY);
	}

	this.renderLanguageControls = function(languages)
	{
		if(!languages)
		{
			languages = backgroundPage.contentManager.getLanguagesData();
		}
		var activeLanguageControls = 0;
			languagesTable = document.getElementById('languageButtons'),
			showLangs = backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.SHOW_LANGUAGE_KEY],
			notifLangs = backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.NOTIFICATIONS_LANGUAGE_KEY];
		if(languages.length>0 && languagesTable)
		{
			var caroDiv=document.createElement("div");
			$(caroDiv).addClass("item").addClass("active");
			var buttonsToAdd = 0;
			for(i=0; i<languages.length; i++)
			{
				if(!showLangs || showLangs[languages[i]])
				{
					var button = document.createElement('button');
					button.setAttribute('class','btn');
					button.setAttribute('id',languages[i].toLowerCase()+"Button");
					button.innerHTML = languages[i];
					button.addEventListener('click',function(){interactionManager.languageControlClickHandler(this);});
					button.setAttribute('style','margin:4px;');
					caroDiv.appendChild(button);
					buttonsToAdd++;
					activeLanguageControls++;
					if(buttonsToAdd == 3)
					{
						$(caroDiv).appendTo($(".carousel-inner"));
						caroDiv=document.createElement("div");
						$(caroDiv).addClass("item");
						buttonsToAdd = 0;
					}
				}
			}
			if(buttonsToAdd != 0)
			{
				$(caroDiv).appendTo($(".carousel-inner"));
			}
			if(activeLanguageControls <= 3)
			{
				$(".carousel-control").css('display','none');
			}
			for(var j=0; j<languages.length;j++)
			{
				if(backgroundPage.newMoviesCnt[j]>0 && 
					(!showLangs || showLangs[languages[j]]) && 
					(!notifLangs || notifLangs[languages[j]]))
				{
					renderManager.addLanguageControlBadge($("#"+languages[j].toLowerCase()+"Button")[0], backgroundPage.newMoviesCnt[j]);
				}	
			}
		}
		languagesTable.style.opacity = 1.0;
	}

	this.renderSelectedLanguageControl = function(language)
	{
		renderManager.selectedLanguage = language;
		var languages = backgroundPage.contentManager.getLanguagesData(),
			showLangs = backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.SHOW_LANGUAGE_KEY];
		for(i=0; i<languages.length; i++)
		{
			if(!showLangs || showLangs[languages[i]])
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
		if(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.VIEW_STYLE_KEY] == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			renderManager.listViewHolder.parentNode.style.opacity = 0.0;
		}
		else
		{
			renderManager.tileViewHolder.style.opacity = 0.0;
		}
		setTimeout(function(){renderManager.renderDataSource(movieItemsSource);},250);
	}

	this.switchViewStyle = function()
	{
		this.renderMovieItems();
	}

	this.renderDataSource = function(movieItemsSource)
	{
		var titleTable,
			movieObjects = renderManager.dataSource;
		if(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.VIEW_STYLE_KEY] == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			titleTable = renderManager.listViewHolder.parentNode;
			renderManager.usedHolder = renderManager.listViewHolder;
			renderManager.unusedHolder = renderManager.tileViewHolder;
		}
		else
		{
			titleTable = renderManager.tileViewHolder;
			renderManager.usedHolder = titleTable;
			renderManager.unusedHolder = renderManager.listViewHolder;
		}
		renderManager.usedHolder.innerHTML = "";  //Removing all other names
		renderManager.unusedHolder.innerHTML = "";
		for(i=0; i<movieObjects.length; i++)
		{
			renderManager.addMovieItemToRenderedList(movieObjects[i]);
		}
		titleTable.style.opacity = 1.0;
		if(movieItemsSource == "latest")
		{
			var language = renderManager.selectedLanguage;
			if(language)
			{
				if(backgroundPage.newMoviesCnt[backgroundPage.contentManager.getLanguageIndex(language)]>0)
				{
					backgroundPage.localStorageManager.setLocalStorageValueForKey(language.toLowerCase()+"Movies",backgroundPage.localStorageManager.buildMovieNamesArray(renderManager.dataSource));
					sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS, language);
				}
			}
		}
	}

	this.addMovieItemToRenderedList = function(movieObject)
	{
		renderManager.usedHolder.appendChild(this.createMovieItem(movieObject));
	}

	this.addMovieItemToRenderedListAtIndex = function(movieObject, index)
	{
		if(index == 0)
		{
			$('#movieTitlesList > tbody > tr').eq(0).before(this.createMovieItem(movieObject));	
		}
		else
		{
			$('#movieTitlesList > tbody > tr').eq(index-1).after(this.createMovieItem(movieObject));	
		}
	}

	this.createMovieItem = function(movieObject)
	{
		var item;
		if(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.VIEW_STYLE_KEY] == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			item = this.createMovieListItem(movieObject);
		}
		else
		{
			item = this.createMovieTile(movieObject);
		}
		return item;
	}

	this.createMovieTile = function(movieObject)
	{
		var div = document.createElement('div');
		div.setAttribute('title',movieObject.movieTitle);
		div.setAttribute('class','movieTile');
		if(movieObject.isNew)
		{
			div.style.backgroundColor = "#fcf8e3";
		}
		cover = document.createElement('img');
		cover.setAttribute('src',movieObject.movieCover);
		cover.setAttribute('class','tileMovieCover');
		nameDiv = document.createElement('div');
		nameDiv.innerHTML = movieObject.movieTitle;
		nameDiv.setAttribute('class','tileMovieNameDiv');
		div.appendChild(cover);
		div.appendChild(nameDiv);
		clickHandler = interactionManager.getMovieRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+movieObject.watchURL);
		div.addEventListener('click',clickHandler);
		return div;
	}

	this.createMovieListItem = function(movieObject)
	{
		var tr = document.createElement('tr');
		if(movieObject.isNew)
		{
			tr.setAttribute('class','warning');
		}
		var holderDiv = document.createElement('div');
		td = document.createElement('td');
		cover = document.createElement('img');
		cover.setAttribute('src',movieObject.movieCover);
		cover.setAttribute('class','listMovieCover');
		nameDiv = document.createElement('div');
		nameDiv.innerHTML = movieObject.movieTitle;
		nameDiv.setAttribute('class','movieNameDiv');
		descDiv = document.createElement('div');
		descDiv.innerHTML = this.formatMovieDescription(movieObject);
		descDiv.setAttribute('class','movieDescDiv');
		holderDiv.appendChild(cover);
		holderDiv.appendChild(nameDiv);
		holderDiv.appendChild(descDiv);
		td.appendChild(holderDiv);
		td.style.minWidth = "355px";
		tr.appendChild(td);
		tr.style.cursor = 'pointer';
		clickHandler = interactionManager.getMovieRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+movieObject.watchURL);
		tr.addEventListener('click',clickHandler);
		return tr;
	}

	this.formatMovieDescription = function(movieObject)
	{
		var details = ["", "", ""]; //cast, director, music
		for(var i=0; i<3; i++)
		{
			var currDetail;
			switch(i)
			{
				case 0:
					currDetail = movieObject.lead;
					break;

				case 1:
					currDetail = movieObject.direction;
					break;

				case 2:
					currDetail = movieObject.music;
					break;
			}
			if(currDetail.length == 0)
				details[i] = "Information not available.";
			else
			{
				for(var j=0; j<currDetail.length; j++)
				{
					details[i] += j==0?currDetail[j]:", "+currDetail[j];
				}
			}
		}
		formattedDescription = "<i>Cast:</i> "+details[0] + "<br><i>Director:</i> "+ details[1] + "<br><i>Music:</i> " + details[2];
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

	this.renderToolsBar = function()
	{
		interactionManager.setBottomBarInteraction();
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
		renderManager.renderSelectedLanguageControl(language);
		renderManager.dataSource = backgroundPage.contentManager.getMoviesData(language);
		renderManager.renderMovieItems("latest");
	}

	this.getMovieRowClickHandler = function(url)
	{
		return function()
		{
			chrome.tabs.create({"url":url},function(){});
		}
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
			if(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.VIEW_STYLE_KEY] != backgroundPage.CONSTANTS.TILE_VIEW_STYLE)
			{
				backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_KEY, backgroundPage.CONSTANTS.TILE_VIEW_STYLE);
				renderManager.switchViewStyle();
				$("#listView").attr("active","false");
				$("#tileView").attr("active","true");
			}

		})
		$("#listView").click(function()
		{
			if(backgroundPage.preferencesManager.prefs[backgroundPage.CONSTANTS.VIEW_STYLE_KEY] != backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
			{
				backgroundPage.preferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.VIEW_STYLE_KEY, backgroundPage.CONSTANTS.LIST_VIEW_STYLE);
				renderManager.switchViewStyle();
				$("#listView").attr("active","true");
				$("#tileView").attr("active","false");
			}
		})
	}
}

Array.prototype.insert = function (index, item) {
  this.splice(index, 0, item);
};
