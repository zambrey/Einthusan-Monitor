/*
 * Author
 * Ameya Zambre
 * ameyazambre@gmail.com
 */
var backgroundPage = null,
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
	if(msgType == backgroundPage.RESET_NEW_FLAGS)
	{
		msgObject.language = languageName;
	}
	chrome.extension.sendRequest(msgObject, function(response){
		if(response.messageType == backgroundPage.FLAGS_RESET)
		{
			popupObject.PopupRenderManager.removeLanguageControlBadge(languageName);
		}
	});
}

function PopupRenderManager()
{
	var renderObject = new Object();
	renderObject.initRender = function()
	{
		if(chrome.extension.getBackgroundPage().isDataReady)
		{
			var startLang, languages;
			popupObject.PopupRenderManager.hideProgressIndicator();
			backgroundPage = chrome.extension.getBackgroundPage();
			languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
			popupObject.PopupRenderManager.renderLanguageControls(languages);
			startLang = backgroundPage.backgroundObject.PreferencesManager.getPreferenceValue(backgroundPage.CONSTANTS.DEF_LANG_PREF);
			if(!startLang)
			{
				startLang = languages[0];
				backgroundPage.backgroundObject.PreferencesManager.setPreferenceValue(backgroundPage.CONSTANTS.DEF_LANG_PREF, startLang);
			}
			popupObject.PopupRenderManager.renderMoviesForLanguage(startLang);
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
				/*if(backgroundPage.newMoviesCnt[i]>0)
				{
					badge = document.createElement('span');
					badge.setAttribute('class','badge badge-warning');
					badge.setAttribute('style','position:absolute; right:-8px;top:-8px;');
					badge.innerText = backgroundPage.newMoviesCnt[i];	
					div.appendChild(badge);
				}*/

				button.setAttribute('style','margin:4px;');
				languagesTable.appendChild(button);
			}
		}
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
	renderObject.renderMoviesForLanguage = function(language)
	{
		var languages = backgroundPage.backgroundObject.ContentManager.getLanguagesData();
		popupObject.PopupRenderManager.renderSelectedLanguageControl(language);
		var index = languages.indexOf(language),
			movieList = backgroundPage.backgroundObject.ContentManager.getMoviesData(language);
		this.renderMoviesTable(movieList);
		backgroundPage.backgroundObject.CookieManager.setCookie(language.toLowerCase(),movieList);
		if(backgroundPage.newMoviesCnt[index]>0)
		{	
			sendMessage(backgroundPage.RESET_NEW_FLAGS, language);
		}
	}
	renderObject.renderMoviesTable = function(movieObjects)
	{
		var titleTable = document.getElementById('movieTitles'),
			tbody = document.createElement('tbody'),
			movieTitle,
			movieCover,
			tr,
			td,
			indexTd,
			coverTd,
			cover,
			nameDiv,
			clickHandler;
		titleTable.innerHTML = '';  //Removing all other names
		for(i=0; i<movieObjects.length; i++)
		{
			movieTitle = movieObjects[i].movieTitle;
			movieCover = movieObjects[i].movieCover;
			movieDetails = movieObjects[i].movieDetails;
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
			nameDiv.setAttribute('style','font-weight:bold;');
			descDiv = document.createElement('div');
			descDiv.innerHTML = this.formatMovieDescription(movieDetails);
			descDiv.setAttribute('style','height:40px; overflow:auto;color:#555555; font-size:8pt;');
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
		titleTable.appendChild(tbody);
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
		var button = document.getElementById(languageName.toLowerCase()+"Button");
		button.parentNode.removeChild(button.parentNode.lastChild);
		/*var titleTable = document.getElementById('movieTitles').firstChild;
		for(i=0; i < titleTable.children.length; i++)
		{
			titleTable.children[i].removeAttribute('class');
		}*/
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
		/*Implement later*/
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
		pi = document.getElementById('progressIndicatorDiv');
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
		var language = control.innerText;
		//getMoviesForLanguage(languageName);
		popupObject.PopupRenderManager.renderMoviesForLanguage(language);
	}
	interactionObject.getMovieRowClickHandler = function(url)
	{
		return function()
		{
			chrome.tabs.create({"url":url},function(){});
		}
	}
	return interactionObject;
}