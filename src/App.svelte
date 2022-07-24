<script>
  export let config;
  const fs = require("fs");
  let directoryChanging = false;
  let currentFile;
  let files = config.files || [];

  const { remote } = require("electron");

  const Player = require("../lib/Player");
  const { getSpotifyData } = require("../lib/Player");
  let thumbnail = "../static/img/placeholder.png";

  function changeDirectory() {
    directoryChanging = true;
    let types = [".mp3", ".wav", ".flac"];
    let firstFile = [...this.files].filter((f) => f.type.includes("audio"));

    if ([...this.files].length < 1) return alert("No files found");
    if (!firstFile[0]) return;

    // Get path to the music folder
    let filePath = firstFile[0].path;
    let lastIndex = filePath.lastIndexOf("\\");
    let folderPath = filePath.slice(0, lastIndex + 1);

    // Update path in config;
    config.path = folderPath;
    fs.readdir(config.path, async (error, data) => {
      if (error) return console.error(error);
      let filtered = data.filter((f) => types.some((type) => f.endsWith(type)));
      const spotifyLoop = async (array) => {
        const asyncResults = [];
        for (const f of array) {
          currentFile = f;
          let trun = f.replace(".mp3", "").replace(".wav", "").replace(".flac", "");
          let entry = {
            raw: f,
            filtered: trun,
            thumb: null,
          };
          try {
            let sData = await getSpotifyData(trun);
            if (sData && sData.image) {
              entry.thumb = sData.image;
            } else {
              entry.thumb = null;
            }
          } catch (e) {
            console.log("Something went wrong when attempting to load spotify data", e);
          }
          asyncResults.push(entry);
        }
        currentFile = undefined;
        return asyncResults;
      };
      files = await spotifyLoop(filtered);
      fs.writeFile(process.cwd() + "\\src\\config.json", JSON.stringify({ path: folderPath, files }), (writeError) => {
        if (writeError) {
          return console.error(writeError);
        }
      });
    });
  }

  function minimise() {
    remote.BrowserWindow.getFocusedWindow().minimize();
  }
  function maximise() {
    remote.BrowserWindow.getFocusedWindow().setFullScreen(!remote.BrowserWindow.getFocusedWindow().isFullScreen());
  }
  function close() {
    remote.BrowserWindow.getFocusedWindow().close();
  }

  const player = new Player(config, files);
</script>

<!-- Title Bar -->
<div class="title-container">
  <img class="icon title-icon control-icon" src="../static/icons/minimise.svg" alt="-" on:click={minimise} />
  <img class="icon title-icon control-icon" src="../static/icons/maximise.svg" alt="[]" on:click={maximise} />
  <img class="icon title-icon control-icon" src="../static/icons/close.svg" alt="x" on:click={close} />
</div>

<!-- Top navbar -->
<nav class="topnav">
  <div class="left">
    <div class="nav-item">Music Player</div>
  </div>
  <div class="right">
    <div class="nav-item">
      <!-- Folder import -->
      <label class="main-button">
        <input type="file" webkitdirectory="true" directory on:change={changeDirectory} />
        Select music folder
      </label>
    </div>
  </div>
</nav>

<div class="centered">
  <div class="spacer">
    <h1 class="title">Music folder</h1>
    <h2 class="subtitle">{files.length < 1 ? "No suitable files have been found or no folder has been selected..." : ""}</h2>
    <!-- Files -->
    <div class="files">
      {#if directoryChanging}
      <div class="file">
        <div class="loading-files"><h2>Loading files.. Please wait</h2></div>
        {#if currentFile}
          <div class="loaded-file-meta">Loading Metadata for {currentFile}</div>
        {/if}
        </div>
      {:else}
        {#each files as file}
          <div class="file">
            <div class="file-header">
              <span class="file-name">{file.filtered}</span>
            </div>
            <img id={file.raw + "-art"} class="album-art thumbnail" src={file.thumb} alt="Art" />
            <img id={file.raw} class="icon file-play" src="../static/icons/play.svg" alt="Play" on:click={() => player.play(file.raw, file.thumb)} />
          </div>
        {/each}
      {/if}
    </div>
  </div>
</div>

<!-- Bottom player -->
<footer class="player">
  <div class="thumbnail">
    <img id="thumbnail" class="thumbnail" src={Player.nowPlaying ? Player.nowPlaying.thumbnail : thumbnail} alt="Thumbnail" />
  </div>
  <div class="player-container">
    <h2 id="title" class="subtitle player-title">Nothing is currently playing</h2>
    <div class="player-controls">
      <img id="previous" class="icon control-icon" src="../static/icons/previous.svg" alt="Previous" on:click={() => player.previous()} />
      <img id="pause" class="icon control-icon" src="../static/icons/play.svg" alt="Pause" on:click={() => player.pause()} />
      <img id="stop" class="icon control-icon" src="../static/icons/stop.svg" alt="Stop" on:click={() => player.destroy()} />
      <img id="next" class="icon control-icon" src="../static/icons/next.svg" alt="Next" on:click={() => player.skip()} />
      <img id="loop" class="icon control-icon" src="../static/icons/loop.svg" alt="Loop" on:click={() => player.loopSong()} />
    </div>
    <div class="duration-container">
      <div class="progress-container">
        <div id="base-bar" class="bar" />
        <input on:change={(e) => player.stopSeek(e)} on:input={(e) => player.seek(e)} class="slider" id="slider" type="range" value="0" min="0" max="100" step=".1" />
        <div id="progress-bar" class="overlay-bar" />
      </div>
      <div class="time-container">
        <div id="ct" class="current-time">00:00</div>
        <div>/</div>
        <div id="sl" class="song-length">00:00</div>
      </div>
    </div>
  </div>
</footer>

<style scoped>
  :root {
    --player-height: 120px;
  }
  .topnav {
    background-color: #1f2024;
    display: flex;
    flex-direction: row;
    align-content: center;
    justify-content: space-between;
  }
  .player {
    position: fixed;
    bottom: 0;
    height: calc(var(--player-height) - 20px);
    width: 100%;
    background-color: #131316;
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    align-content: flex-start;
    transition: all 0.3s ease-in-out;
  }
  .right,
  .left {
    display: flex;
    flex-direction: row;
    align-content: center;
    padding: 10px;
  }
  .nav-item {
    color: white;
    padding: 10px;
  }
  .main-button {
    all: unset;
    background-color: rgb(167, 166, 180);
    padding: 10px;
    border-radius: 6px;
    box-shadow: rgba(148, 148, 148, 0.1) 0px 10px 25px;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
  }
  input[type="file"] {
    display: none;
  }
  .main-button:hover {
    box-shadow: rgba(148, 148, 148, 0.2) 0px 10px 35px;
    background-color: rgb(183, 182, 196);
  }
  .album-art {
    height: 100%;
    width: 150px;
    object-fit: cover;
  }
  .title {
    font-size: 30px;
    color: rgb(167, 166, 180);
  }
  .subtitle {
    font-size: 20px;
    color: rgb(73, 73, 77);
  }
  .files {
    display: flex;
    flex-direction: column;
    align-content: center;
    align-items: center;
    margin-bottom: var(--player-height);
  }
  .file {
    background-color: #1f2024;
    /* padding: 10px; */
    margin: 4px;
    height: 150px;
    width: 50vw;
    border-radius: 2px;
    position: relative;
    color: white;
  }
  .file-name {
    color: white;
    margin: 4px;
  }
  .loaded-file-meta {
    margin-top: 65px;
  }
  .file-play {
    z-index: 10;
    position: absolute;
    right: 0;
    top: 0;
    top: 95px;
  }
  .file-header {
    padding: 8px;
    width: fit-content;
    z-index: 10;
    position: absolute;
    left: 150px;
    top: 0;
  }
  .icon {
    width: 50px;
    height: 50px;
    padding: 12px;
    transition: all 0.25s ease-in-out;
    cursor: pointer;
    float: left;
    filter: invert(90%) sepia(7%) saturate(169%) hue-rotate(196deg) brightness(106%) contrast(91%);
  }
  .icon:hover {
    filter: invert(5%) sepia(5%) saturate(462%) hue-rotate(201deg) brightness(102%) contrast(94%);
  }
  .thumbnail {
    float: left;
  }
  .thumbnail img {
    height: 100px;
    width: 100px;
  }
  .player-title {
    float: none;
    color: rgb(167, 166, 180);
    margin: 0;
    margin-left: 10px;
    margin-top: 8px;
  }
  .player-controls img {
    width: 45px;
    height: 45px;
  }
  .control-icon {
    filter: invert(90%) sepia(7%) saturate(169%) hue-rotate(196deg) brightness(106%) contrast(91%) !important;
  }
  .title-icon {
    width: 35px;
    height: 35px;
    padding: 8px;
    transition: all 0.2s ease-in-out;
    -webkit-app-region: no-drag;
  }
  .title-icon:hover {
    background-color: #dedee4;
  }
  .control-icon:hover {
    filter: invert(93%) sepia(17%) saturate(121%) hue-rotate(201deg) brightness(95%) contrast(95%) !important;
  }
  .player-container {
    display: flex;
    flex-direction: column;
    align-content: center;
    align-items: left;
  }
  .duration-container {
    display: flex;
    flex-direction: row;
    align-content: center;
    align-items: center;
    margin-left: 10px;
  }
  .progress-container {
    position: relative;
    right: 0;
    margin-right: 10px;
  }
  .time-container {
    display: flex;
    flex-direction: row;
    align-content: center;
    align-items: center;
    justify-content: space-between;
  }
  .time-container div {
    color: rgb(167, 166, 180);
    margin-right: 2px;
    margin-left: 2px;
  }
  .bar {
    position: relative;
    background: #1f1f21;
    height: 6px;
    width: 25vw;
    border-radius: 4px;
  }
  .overlay-bar {
    position: absolute;
    top: 0;
    background: rgb(118, 118, 118);
    height: 6px;
    max-width: 100%;
    width: 0%;
    border-radius: 4px;
    /* transition: width 0.2s ease-in-out; */
  }
  .slider {
    position: absolute;
    top: 0;
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 5px;
    background: transparent;
    border: none;
    outline: none;
    -webkit-transition: 0.2s;
    transition: opacity 0.2s;
    padding: 0;
    opacity: 1;
    z-index: 69;
  }
  .slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: rgb(118, 118, 118);
    cursor: pointer;
    opacity: 1;
  }
  .title-container {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    background-color: #131316;
    -webkit-app-region: drag;
    -webkit-user-select: none;
    -khtml-user-select: none;
    -moz-user-select: none;
    -o-user-select: none;
    user-select: none;
  }
</style>
