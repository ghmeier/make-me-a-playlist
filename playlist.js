window.onload=function(){
(function() {
  //$("")
  Handlebars.registerHelper('list', function(items, options) {
  var out = "<ul class='collection'>";

  for(var i=0, l=items.length; i<l; i++) {
    out = out + "<li class='collection-item'><div>" + options.fn(items[i]) +"<a href='#!' class='secondary-content waves-effect waves-green' id='"+items[i].id+"'>Find Similar!</a></div></li>";

  }

  return out + "</ul>";
});

Handlebars.registerHelper('tracklist', function(items, options) {
  var out = "<ul class='collection>";

  for(var i=0, l=items.length; i<l; i++) {
    out = out + "<li class='collection-item'>" + options.fn(items[i].track) + "</li>";

  }

  return out + "</ul>";
});

Handlebars.registerHelper('newlist', function(items, options) {
  var out = "";
  var uris = [];
  for(var i=0, l=items.length; i<l; i++) {
    out = out + "<li class='collection-item'>" + options.fn(items[i]) + "</li>";
    uris.push(items[i].uri);
  }

  var joined = uris.join(",");
  return "<ul class='collection with-header'><li class='collection-header'><h4>New Playlist</h4></li><li class='collection-item'><input id='name' type='text' name='playlist-name'><label for='name'>Playlist Name</label><div id='new-list-button' data-uris='"+joined+"'class='secondary-content waves-effect waves-green'>Create This Thang</div></div>"+out + "</ul>";
});

    function login(callback) {
        var CLIENT_ID = 'ff3f738d49e74607b92e27a50e8e424d';
        var REDIRECT_URI = 'http://localhost/make-me-a-playlist/callback.html';
        function getLoginURL(scopes) {
            return 'https://accounts.spotify.com/authorize?client_id=' + CLIENT_ID +
              '&redirect_uri=' + encodeURIComponent(REDIRECT_URI) +
              '&scope=' + encodeURIComponent(scopes.join(' ')) +
              '&response_type=token';
        }
        
        var url = getLoginURL([
            'user-read-email',"playlist-read-private","playlist-modify-public","playlist-modify-private","user-library-read"
        ]);
        
        var width = 450,
            height = 730,
            left = (screen.width / 2) - (width / 2),
            top = (screen.height / 2) - (height / 2);
    
        window.addEventListener("message", function(event) {
            var hash = JSON.parse(event.data);
            if (hash.type == 'access_token') {
                callback(hash.access_token);
            }
        }, false);
        
        var w = window.open(url,
                            'Spotify',
                            'menubar=no,location=no,resizable=no,scrollbars=no,status=no, width=' + width + ', height=' + height + ', top=' + top + ', left=' + left
                           );
        
    }

    function getUserData(accessToken) {
        return $.ajax({
            url: 'https://api.spotify.com/v1/me',
            headers: {
               'Authorization': 'Bearer ' + accessToken
            }
        });
    }

    function getUserPlaylist(accessToken,userId){
        return $.ajax({
            url: 'https://api.spotify.com/v1/users/'+userId+"/playlists?offset=0&limit=50",
            headers: {
               'Authorization': 'Bearer ' + accessToken
            }
        });     
    }

    function getTopTrack(accessToken,artistId){
      return $.ajax({
            url: 'https://api.spotify.com/v1/artists/'+artistId+"/top-tracks?country=US",
            headers: {
               'Authorization': 'Bearer ' + accessToken
            }
        });     
    }

    function createPlaylist(accessToken,userId,name){
       return $.ajax({
            type:"POST",
            url: 'https://api.spotify.com/v1/users/'+userId+"/playlists",
            data: "{\"name\":\""+name+"\",\"public\":\"false\"}",
            headers: {
               'Authorization': 'Bearer ' + accessToken
            }
        });        
    }

    function addSongsPlaylist(accessToken,userId,playlistId,songs){
       return $.ajax({
            type:"POST",
            url: 'https://api.spotify.com/v1/users/'+userId+"/playlists/"+playlistId+"/tracks?position=0&uris="+encodeURIComponent(songs),
            headers: {
               'Authorization': 'Bearer ' + accessToken
            }
        });        
    }

    function renderPlaylists(response,userId,accessToken){
          var personalPlaylists = {items:[]};
              for (i in response.items){
                if (response.items[i].owner.id === userId){
                  personalPlaylists.items.push(response.items[i]);
                }else{
                  console.log(response.items[i]);
                }
              }
              var templateSource = document.getElementById('playlist-template').innerHTML,
              template = Handlebars.compile(templateSource),
              resultsPlaceholder = document.getElementById('playlist');
              resultsPlaceholder.innerHTML = template(personalPlaylists);

              for (i in personalPlaylists.items){
                var playlistButton = document.getElementById(personalPlaylists.items[i].id);
/*                playlistButton.addEventListener("click",function(e){
                  var playlistId = e.target.id;
                  playlistClick(accessToken,userId,playlistId);
                });*/
                var moreButton = document.getElementById(personalPlaylists.items[i].id);
                moreButton.addEventListener('click',function(e){
                  var playlistId = e.target.id.replace("_get","");
                  getSimilarPlaylist(accessToken,userId,playlistId);
                });
              }
    }

    function playlistClick(accessToken,userId,playlistId){
      getPlaylistTracks(accessToken,userId,playlistId).success(function(response){
        renderPlaylistTracks(response,userId,playlistId);
      }).error(function(error){
                      console.log(error.responseJSON.error.message);
                      toast(error.responseJSON.error.message,4000);
                    });
    }

    function getPlaylistTracks(accessToken,userId,playlistId,limit){
      var url = "https://api.spotify.com/v1/users/"+userId+"/playlists/"+playlistId+"/tracks?fields=items(track(id,name,album(id,name),artists(name,id)))&offset=0";
        if (limit){
          url+="&limit="+limit;
        }
      return $.ajax({
        url: url,
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
      });
    }

    function renderPlaylistTracks(response,userId,playlistId){
          console.log(response);
          var templateSource = document.getElementById('track-list-template').innerHTML,
          template = Handlebars.compile(templateSource),
          resultsPlaceholder = document.getElementById(playlistId);
          var inner = resultsPlaceholder.innerHTML;
          resultsPlaceholder.innerHTML =inner + template(response);      
    }

    function getSimilarPlaylist(accessToken,userId,playlistId){
      var tracks = [];
      var iter = 0;
      getPlaylistTracks(accessToken,userId,playlistId,30).success(function(response){
        for (i=0;i<response.items.length;i++){
          var track = {};
          track['name'] = response.items[i].track.name;
          track['id'] = response.items[i].track.id;
          track['album'] = response.items[i].track.album.name;
          track['artistName'] = response.items[i].track.artists[0].name;
          track['artistId'] = response.items[i].track.artists[0].id;
          tracks.push(track);

          if (response.items.length + iter < 30){
            console.log(i);
            i--;
            iter++;
          }
        }
        
        getArtistFromTracks(accessToken,userId,tracks,trackStuff);
        
      }).error(function(error){
                      console.log(error.responseJSON.error.message);
                      toast(error.responseJSON.error.message,4000);
                    });;
    }

    function trackStuff(accessToken,userId,similar){
      if (similar.length < 30){
        return;
      }

      var items = [];
      var iter = 0;
      $.each(similar,function(i){
          getTopTrack(accessToken,similar[i].id).success(function(response){
            var index = Math.floor(Math.random()*response.tracks.length);
            if (response.tracks[index] && response.tracks[index].name){
              var track = response.tracks[index];
              items.push(track);
              renderSimilar(accessToken,userId,items);
            }
          }).error(function(error){
                      console.log(error.responseJSON.error.message);
                      toast(error.responseJSON.error.message,4000);
                    });;          
      });
    }

    function renderSimilar(accessToken,userId,songs){
              var templateSource = document.getElementById('new-list-template').innerHTML,
              template = Handlebars.compile(templateSource),
              resultsPlaceholder = document.getElementById('prospective');
              var temp = {};
              temp['items'] = songs;
              console.log(songs);
              resultsPlaceholder.innerHTML = template(temp); 
              var playlistButton = document.getElementById('new-list-button');
              playlistButton.addEventListener("click",function(e){
                var uris = e.target.getAttribute("data-uris");
                var name = document.getElementById("name").value;

                createPlaylist(accessToken,userId,name).success(function(response){
                  var url = response.external_urls.spotify;
                  addSongsPlaylist(accessToken,userId,response.id,uris).success(function(res){
                    document.getElementById("prospective").innerHTML = "<div class='col s12 l12'><a class='btn-large waves-effect waves-light' target='_blank' href=\""+url+"\" >Listen Now!</a></div>";
                    $(".collapsible").collapsible({accordion:true});

                  }).error(function(error){
                      console.log(error.responseJSON.error.message);
                      toast(error.responseJSON.error.message,4000);
                    });
                }).error(function(error){
                      console.log(error.responseJSON.error.message);
                      toast(error.responseJSON.error.message,4000);
                    });
              });

    }

    function getArtistFromTracks(accessToken,userId,tracks,callback){
        var similar = [];
        for (i in tracks){
            getSimilarArtists(accessToken,userId,tracks[i]['artistId']).success(function(response){
              var index = Math.floor(Math.random()*response.artists.length);
              for (j in tracks){
                if (i == j || response.artists[index] == tracks[j]){
                  i--;
                  break;
                }
              }

              similar.push(response.artists[index]);
              callback(accessToken,userId,similar);
            }).error(function(error){
                      console.log(error.responseJSON.error.message);
                      toast(error.responseJSON.error.message,4000);
                    });
        }
    }

    function getSimilarArtists(accessToken,userId,artistId){
      return $.ajax({
        url:"https://api.spotify.com/v1/artists/"+artistId+"/related-artists",
        headers: {
          "Authorization" : "Bearer "+accessToken
        }
      })
    }

    var templateSource =document.getElementById('result-template').innerHTML,
        template = Handlebars.compile(templateSource),
        resultsPlaceholder = document.getElementById('result'),
        loginButton = document.getElementById('btn-login');
    
    loginButton.addEventListener('click', function() {
        login(function(accessToken) {
            getUserData(accessToken)
                .then(function(response) {
                    var userId = response.id;
                    getUserPlaylist(accessToken,response.id).success(function(response){
                      renderPlaylists(response,userId,accessToken);
                    }).error(function(error){
                      console.log(error.responseJSON.error.message);
                      toast(error.responseJSON.error.message,4000);
                    });
                    loginButton.style.display = 'none';
                    var desc = document.getElementById("description");
                    desc.style.display = "none";
                });
            });
    });
    
})();
}//]]> 