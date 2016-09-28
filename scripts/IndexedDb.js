/*eslint-env browser */
/*eslint no-var: "error"*/
/*eslint prefer-const: "error"*/
/*eslint-env es6*/

  const DB_NAME = 'offwebreader';
  const DB_VERSION = 3; // Use a long long for this value (don't use a float)
  const DB_STORE_NAME = 'stories';

  var db;

  // Used to keep track of which view is displayed to avoid uselessly reloading it
  var current_view_pub_key;

  function openDb(fn) {
    console.log("openDb ...");
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onsuccess = function (evt) {
      // Better use "this" than "req" to get the result to avoid problems with
      // garbage collection.
      // db = req.result;
      db = this.result;
      console.log("openDb DONE");
      fn();
    };
    req.onerror = function (evt) {
      console.error("openDb:", evt.target.errorCode);
    };

    req.onupgradeneeded = function (evt) {
      console.log("openDb.onupgradeneeded");
      const store = evt.currentTarget.result.createObjectStore(
        DB_STORE_NAME, { keyPath: 'ChapterId', autoIncrement: true });

      store.createIndex('ChapterId', 'ChapterId', { unique: true });
      store.createIndex('AuthorName', 'AuthorName', { unique: false });
      store.createIndex('StoryName', 'StoryName', { unique: false });
      store.createIndex('ChapterNumber', 'ChapterNumber', { unique: false });
    };
  }

  /**
   * @param {string} store_name
   * @param {string} mode either "readonly" or "readwrite"
   */
  function getObjectStore(store_name, mode) {
    const tx = db.transaction(store_name, mode);
    return tx.objectStore(store_name);
  }

  function clearObjectStore() {
    const store = getObjectStore(DB_STORE_NAME, 'readwrite');
    const req = store.clear();
    req.onsuccess = function(evt) {
      displayActionSuccess("Store cleared");
      displayStoryList(store);
    };
    req.onerror = function (evt) {
      console.error("clearObjectStore:", evt.target.errorCode);
      displayActionFailure(this.error);
    };
  }

  function getChapter(ChapterId){
    const request = db.transaction(DB_STORE_NAME).objectStore(DB_STORE_NAME).get(ChapterId);
    request.onerror = function(event) {
      console.log("GetChapterError: ", request.error);
    };
    request.onsuccess = function(event) {
      if(request.result){
        const value = event.target.result;
        console.log(value.Content.slice(0, 300));
          //TODO: Raphael, a logica de cada capítulo deve entrar aqui, essa é a estrutura básica
          //pode transformar em callback, como em populateStoryArray
          storyList.innerHTML = `<div class="chapterBox">${value.Content}</div>`;
      }
    };
  }

  function getStories(){
    const objectStore = db.transaction(DB_STORE_NAME).objectStore(DB_STORE_NAME);
    const storyMap = new Map();
    objectStore.openCursor().onsuccess = function(event) {
      const cursor = event.target.result;
      if(cursor) {
        if(!storyMap.has(cursor.value.StoryName)){
          storyMap.set(cursor.value.ChapterId.split(".")[0]+"."+cursor.value.NumberOfChapters, cursor.value.StoryName);
        }
        cursor.continue();
      } else {
        console.log('Entries all displayed.');
      }
    };
    return storyMap;
  }
  const callbackTest = function (data){

          storyList.insertAdjacentHTML('beforeend', `<div class="chapterBox">${data.StoryName}</div>`);
  }
  function getStories(callback){
    const objectStore = db.transaction(DB_STORE_NAME).objectStore(DB_STORE_NAME);
    const storyMap = new Map();
    objectStore.openCursor().onsuccess = function(event, callback) {
      const cursor = event.target.result;
      if(cursor) {
        if(!storyMap.has(cursor.value.StoryName)){
          callback(cursor.value);
          storyMap.set(cursor.value.ChapterId.split(".")[0]+"."+cursor.value.NumberOfChapters, cursor.value.StoryName);
        }
        cursor.continue();
      } else {
        console.log('Entries all displayed.');
      }
    };
    return storyMap;
  }
  function populateStoryArray(onCompleteCallbackFunction){
    const transaction = db.transaction(DB_STORE_NAME);
    const objectStore = transaction.objectStore(DB_STORE_NAME);
    const myArray = [];
    const storySet = new Set();
    const request = objectStore.openCursor();
    request.onsuccess = function() {
      const cursor = this.result;
      if(!cursor) return;
      if(!storySet.has(cursor.value.StoryName)){
        myArray.push(cursor.value);
        storySet.add(cursor.value.StoryName);
      }
      cursor.continue();
    };
    transaction.oncomplete = function() {
      onCompleteCallbackFunction(myArray);
    };
  }

  /**
   * @param {IDBObjectStore=} store
   */
  function displayStoryList(store) {
    console.log("displayStoryList");

    if (typeof store == 'undefined')
      store = getObjectStore(DB_STORE_NAME, 'readonly');

    const storyList = document.querySelector('#storyList');
    storyList.innerHTML = '';

    var req = store.count();
    // Requests are executed in the order in which they were made against the
    // transaction, and their results are returned in the same order.
    // Thus the count text below will be displayed before the actual pub list
    // (not that it is algorithmically important in this case).
    req.onsuccess = function(evt) {
      storyList.insertAdjacentHTML('beforeend', `<p>There are <strong> ${evt.target.result}
                        </strong> chapters(s) in the object store.</p>`);
    };
    req.onerror = function(evt) {
      console.error("add error", this.error);
      displayActionFailure(this.error);
    };

    var i = 0;
    req = store.openCursor();
    req.onsuccess = function(evt) {
      const cursor = evt.target.result;

      // If the cursor is pointing at something, ask for the data
      if (cursor) {
        console.log("storyList cursor:", cursor);
        req = store.get(cursor.key);
        req.onsuccess = function (evt) {
          const value = evt.target.result;
          storyList.insertAdjacentHTML('beforeend', `<div class="chapterBox">${value.Content}</div>`);
        };

        // Move on to the next object in store
        cursor.continue();

        // This counter serves only to create distinct ids
        i++;
      } else {
        console.log("No more entries");
      }
    };
  }

  // function setInViewer(key) {
  //   console.log("setInViewer:", arguments);
  //   key = Number(key);
  //   if (key == current_view_pub_key)
  //     return;

  //   current_view_pub_key = key;

  //   const store = getObjectStore(DB_STORE_NAME, 'readonly');
  // }

  function addOrReplaceStory(chapterId, storyName, url, content, numberOfChapters) {
    const obj = {
      "ChapterId": chapterId,
      "StoryName": storyName,
      "Url": url,
      "Content": content,
      "NumberOfChapters": numberOfChapters};

    const store = getObjectStore(DB_STORE_NAME, 'readwrite');
    var req;
    try {
      req = store.put(obj);
    } catch (e) {
      if (e.name == 'DataCloneError')
        displayActionFailure("This engine doesn't know how to clone a Blob, " +
                             "use Firefox");
      throw e;
    }
    req.onsuccess = function (evt) {
      console.log("Insertion in DB successful");
      // displayActionSuccess();
      //displayStoryList(store);
    };
    req.onerror = function() {
      console.error("addStory error", this.error);
      // displayActionFailure(this.error);
    };
  }

  /**
   * @param {string} ChapterId
   */
  function deleteChapter(ChapterId) {
    console.log("deletePublication:", arguments);
    const store = getObjectStore(DB_STORE_NAME, 'readwrite');
    const req = store.index('ChapterId');
    req.get(ChapterId).onsuccess = function(evt) {
      if (typeof evt.target.result == 'undefined') {
        // displayActionFailure("No matching record found");
        return;
      }
      deletePublication(evt.target.result.id, store);
    };
    req.onerror = function (evt) {
      console.error("deletePublicationFromBib:", evt.target.errorCode);
    };
  }

  /**
   * @param {number} key
   * @param {IDBObjectStore=} store
   */
  function deleteMethod(key, store) {
    console.log("deletePublication:", arguments);

    if (typeof store == 'undefined')
      store = getObjectStore(DB_STORE_NAME, 'readwrite');

    // As per spec http://www.w3.org/TR/IndexedDB/#object-store-deletion-operation
    // the result of the Object Store Deletion Operation algorithm is
    // undefined, so it's not possible to know if some records were actually
    // deleted by looking at the request result.
    const req = store.get(key);
    req.onsuccess = function(evt) {
      const record = evt.target.result;
      console.log("record:", record);
      if (typeof record == 'undefined') {
        // displayActionFailure("No matching record found");
        return;
      }
      // Warning: The exact same key used for creation needs to be passed for
      // the deletion. If the key was a Number for creation, then it needs to
      // be a Number for deletion.
      req = store.delete(key);
      req.onsuccess = function(evt) {
        console.log("evt:", evt);
        console.log("evt.target:", evt.target);
        console.log("evt.target.result:", evt.target.result);
        console.log("delete successful");
        // displayActionSuccess("Deletion successful");
        displayStoryList(store);
      };
      req.onerror = function (evt) {
        console.error("deleteStory:", evt.target.errorCode);
      };
    };
    req.onerror = function (evt) {
      console.error("deleteStory:", evt.target.errorCode);
    };
  }

  // function displayActionSuccess(msg) {
  //   msg = typeof msg != 'undefined' ? "Success: " + msg : "Success";
  //   document.querySelector('#msg').innerHTML = '<span class="action-success">' + msg + '</span>';
  // }
  // function displayActionFailure(msg) {
  //   msg = typeof msg != 'undefined' ? "Failure: " + msg : "Failure";
  //   document.querySelector('#msg').innerHTML = '<span class="action-failure">' + msg + '</span>';
  // }
  // function resetActionStatus() {
  //   console.log("resetActionStatus ...");
  //   const msg = document.querySelector('#msg');
  //   if(msg) msg.innerHTML = '';
  //   console.log("resetActionStatus DONE");
  // }

  // function addEventListeners() {
  //   console.log("addEventListeners");

  //   //document.querySelector('#register-form-reset').addEventListener("click", function(evt) {
  //   //  resetActionStatus();
  //   //});

  //   document.querySelector('#indexedDbSave').addEventListener("click", function(evt) {
  //     console.log("add ...");
  //     const AuthorName = `test`;
  //     const ChapterId = 2;
  //     if (!AuthorName || !ChapterId) {
  //       displayActionFailure("Required field(s) missing");
  //       return;
  //     }
  //     const Url = 1;

  //     const file_input = [{json1: "a"},{"json2": "b"}];
  //     const selected_file = file_input[0];
  //     console.log("selected_file:", selected_file);
  //     // Keeping a reference on how to reset the file input in the UI once we
  //     // have its value, but instead of doing that we rather use a "reset" type
  //     // input in the HTML form.
  //     //file_input.val(null);
  //     const file_url = null;
  //     if (selected_file) {
  //       addPublication(ChapterId, AuthorName, Url, selected_file);
  //     } else if (file_url) {
  //       addPublicationFromUrl(ChapterId, AuthorName, Url, file_url);
  //     } else {
  //       addPublication(ChapterId, AuthorName, Url);
  //     }

  //   });

    // document.querySelector('#delete-button').addEventListener("click", function(evt) {
    //   console.log("delete ...");
    //   const biblioid = document.querySelector('#pub-biblioid-to-delete').val();
    //   const key = 1; //TODO: add key

    //   if (biblioid != '') {
    //     deletePublicationFromBib(biblioid);
    //   } else if (key != '') {
    //     // Better use Number.isInteger if the engine has EcmaScript 6
    //     if (key == '' || isNaN(key))  {
    //       displayActionFailure("Invalid key");
    //       return;
    //     }
    //     key = Number(key);
    //     deletePublication(key);
    //   }
    // });

    // const search_button = document.querySelector('#search-list-button');
    // search_button.addEventListener("click", function(evt) {
    //   displayStoryList();
    // });

  // }
