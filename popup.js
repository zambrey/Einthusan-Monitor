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
		badge.setAttribute('style','position:absolute; top:25px; opacity:1.0; -webkit-transition:top 1s ease-out, opacity 2s ease-out;');
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
		setTimeout(function(){popupObject.PopupRenderManager.renderMoviesTable(language, movieList);},250);
	}
	renderObject.renderMoviesTable = function(language, movieObjects)
	{
		var titleTable,// = document.getElementById('movieTitles'),
			unusedDOM,
			tbody = document.createElement('tbody'),
			movieTitle,
			movieCover,
			tr,
			td,
			coverTd,
			cover,
			nameDiv,
			clickHandler;
		if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			titleTable = document.getElementById('movieTitlesList');
			unusedDOM = document.getElementById('movieTitlesTiles');
		}
		else
		{
			titleTable = document.getElementById('movieTitlesTiles');
			unusedDOM = document.getElementById('movieTitlesList');
		}
		titleTable.innerHTML = '';  //Removing all other names
		unusedDOM.innerHTML = "";
		for(i=0; i<movieObjects.length; i++)
		{
			movieTitle = movieObjects[i].movieTitle;
			movieCover = movieObjects[i].movieCover;
			movieDetails = movieObjects[i].movieDetails;
			if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
			{
				tr = document.createElement('tr');
				if(movieObjects[i].isNew)
				{
					tr.setAttribute('class','warning');
				}
				var holderDiv = document.createElement('div');
				td = document.createElement('td');
				cover = document.createElement('img');
				cover.setAttribute('src',backgroundPage.CONSTANTS.HOME_URL+movieCover);
				cover.setAttribute('style','height:60px; float:left; margin-right:4px;');
				nameDiv = document.createElement('div');
				nameDiv.innerHTML = movieTitle;
				//nameDiv.setAttribute('style','font-weight:bold;');
				nameDiv.setAttribute('class','movieNameDiv');
				descDiv = document.createElement('div');
				descDiv.innerHTML = this.formatMovieDescription(movieDetails);
				descDiv.setAttribute('style','height:40px; color:#555555; font-size:8pt;');
				descDiv.setAttribute('class','movieDescDiv');
				holderDiv.appendChild(cover);
				holderDiv.appendChild(nameDiv);
				holderDiv.appendChild(descDiv);
				td.appendChild(holderDiv);
				tr.appendChild(td);
				tr.style.cursor = 'pointer';
				clickHandler = popupObject.PopupInteractionManager.getMovieRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+movieObjects[i].watchURL);
				tr.addEventListener('click',clickHandler);
				tbody.appendChild(tr);	
			}
			else
			{
				var div = document.createElement('div');
				div.setAttribute('title',movieTitle);
				div.setAttribute('style','text-align:center;float:left; margin:2px; padding:6px;cursor:pointer;');
				if(movieObjects[i].isNew)
				{
					div.style.backgroundColor = "#fcf8e3";
				}
				cover = document.createElement('img');
				cover.setAttribute('src',backgroundPage.CONSTANTS.HOME_URL+movieCover);
				cover.setAttribute('style','height:140px;margin:2px;');
				nameDiv = document.createElement('div');
				nameDiv.innerHTML = movieTitle;
				nameDiv.setAttribute('style','overflow:hidden; height: 20px; width:100px; white-space:nowrap; text-overflow:ellipsis; text-align:center;');
				nameDiv.setAttribute('class','movieNameDiv');
				div.appendChild(cover);
				div.appendChild(nameDiv);
				clickHandler = popupObject.PopupInteractionManager.getMovieRowClickHandler(backgroundPage.CONSTANTS.HOME_URL+movieObjects[i].watchURL);
				div.addEventListener('click',clickHandler);
				titleTable.appendChild(div);
			}
		} 
		titleTable.style.opacity = 1.0;
		if(popupObject.PopupRenderManager.viewStyle == backgroundPage.CONSTANTS.LIST_VIEW_STYLE)
		{
			titleTable.appendChild(tbody);
		}	
		backgroundPage.backgroundObject.CookieManager.setCookie(language.toLowerCase(),movieObjects);
		if(backgroundPage.newMoviesCnt[backgroundPage.backgroundObject.ContentManager.getLanguageIndex(language)]>0)
		{	
			sendMessage(backgroundPage.CONSTANTS.RESET_NEW_FLAGS, language);
		}
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
		/*Not using this yet*/
		$(".icon-search").click(function(){
			if($(".icon-search").css('display')=='block')
			{
				$(".icon-search").css('display','none'); 
				$('.icon-remove').css('display','block');
				$('.form-search').css('display','block');	
				$('#searchDiv').css({'background-color':'#800000','height':'38px'});
			}
			$(".icon-remove").click(function(){
				$(".icon-search").css('display','block'); 
				$('.icon-remove').css('display','none');
				$('.form-search').css('display','none');
				$('#searchDiv').css({'background-color':'none','height':'0'});		
			})
		});
	}
	renderObject.renderToolsBar = function()
	{
		$("#toolsDiv").click(function()
		{
			//$("#toolsPanel").css('display','block');
			$("#toolsPanel").css('right','0');
			$("#toolsPanel").css('opacity','1');
			$("#toolsDiv").css('opacity','0');
		})
		$(".icon-remove").click(function()
		{
			$("#toolsPanel").css('right','-362px');
			$("#toolsPanel").css('opacity','0');
			$("#toolsDiv").css('opacity','0.7');
		})
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
	interactionObject.viewTypeSelectionHandler = function()
	{

	}
	return interactionObject;
}