<link rel="stylesheet" href="../static/css/styles.css">

<svelte:head>
	<title>Music Player</title>
</svelte:head>

<style>
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
	.right, .left {
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
	.title {
		font-size: 30px;
		color:rgb(167, 166, 180);
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
		padding: 10px;
		margin: 4px;
		width: 50vw;
		border-radius: 2px;
	}
	.file-name {
		color: white;
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
		/* background-color: rgb(167, 166, 180); */
		/* padding: 2px; */
	}
	.thumbnail img {
		height: 100px;
		width: 100px;
		/* margin: 5px; */
	}
	.player-title {
		float: none;
		color: rgb(167, 166, 180);
		margin-left: 10px;
		margin-bottom: 0;
	}
	.player-controls img {
		width: 45px;
		height: 45px;
	}
	.control-icon {
		filter: invert(90%) sepia(7%) saturate(169%) hue-rotate(196deg) brightness(106%) contrast(91%) !important;
	}
	.control-icon:hover {
		filter: invert(93%) sepia(17%) saturate(121%) hue-rotate(201deg) brightness(95%) contrast(95%) !important;
	}
	.position-bar {
		display: flex;
		flex-direction: row;
		align-items: center;
		float: left;
		position: absolute;
		left: 0;
		bottom: -15px;
		margin-left: 110px;
	}
	.bar {
		position: relative;
		background: rgb(255, 255, 255, 0.05);
		height: 5px;
		width: 25vw;
		border-radius: 4px;
		margin-right: 10px;
	}
	.bar-overlay {
		position: absolute;
		background: rgb(255, 255, 255, 0.15);
		height: 5px;
		width: 0%;
		border-radius: 4px;
		margin-right: 10px;
		transition: width 0.2s ease-in-out;
	}
	/* .bar {
		width: 25vw;
		height: 5px;
		background-color: #2c2c31;
		border-radius: 6px;
		z-index: 5;
		margin: 10px;
	} */
	/* .bar::after {
		content: "";
		height: 5px !important;
		width: 50% !important;
		background-color: red;
		border-radius: 6px;
		z-index: 10;
	} */
</style>

<script>
	export let config;
	const fs = require('fs');
	// import { onMount } from 'svelte';
	let files = config.files ||  [];

	// onMount(() => {
	// 	setInterval(() => {
	// 		console.log(player.getCurrentTime())
	// 	}, 1000)
	// })

	const Player = require('../lib/Player');
	
	let thumbnail = 'http://www.scottishculture.org/themes/scottishculture/images/music_placeholder.png';
	
	function changeDirectory() {
		let firstFile = [...this.files].filter(f => f.type === "audio/mp3")

		if ([...this.files].length < 1) return alert('No files found');

		// Get path to the music folder
		let filePath = firstFile[0].path;
		let lastIndex = filePath.lastIndexOf('\\');
		let folderPath = filePath.slice(0, lastIndex + 1);
		
		// Update path in config;
		config.path = folderPath;
		fs.readdir(config.path, (error, data) => {
			if (error) return console.error(error);
			files = data.filter(f => f.endsWith('.mp3'));
			fs.writeFile(process.cwd() + '\\src\\config.json', JSON.stringify({path: folderPath, files}), (writeError) => {
				if (writeError) {
					return console.error(writeError)
				}
			});
		})
	}

	const player = new Player(config, files);

</script>

<!-- <main> -->

<!-- Top navbar -->
<nav class="topnav">
	<div class="left">
		<div class="nav-item">Music Player</div>
	</div>
	<div class="right">
		<div class="nav-item">
			<label class="main-button">
				<input type="file" webkitdirectory="true" directory on:change={changeDirectory}/>
				Select music folder
			</label>
			<!-- <input class="main-button" id="design" type="file" webkitdirectory="true" directory on:change={changeDirectory}/> -->
		</div>
	</div>
</nav>

<div class="centered">
	<!-- Folder import -->
	<!-- <div class="spacer">
		<input class="main-button" id="design" type="file" webkitdirectory="true" directory on:change={changeDirectory}/>
	</div> -->
	<div class="spacer">
		<h1 class="title">Music folder</h1>
		<h2 class="subtitle">{files.length < 1 ? 'No suitable files have been found or no folder has been selected...' : ''}</h2>
		<div class="files">
			{#each files as file}
				<div class="file">
					<p class="file-name">{file}</p>
					<img id={file} class="icon" src="../static/icons/play.svg" alt="Play" on:click={() => player.play(file)}>
				</div>
			{/each}
		</div>
	</div>
</div>

<!-- Bottom player -->
<!-- <footer class="player" style="{nowPlaying.playing ? 'display: flex;' : 'display: none;'}"> -->
<footer class="player">
	<div class="thumbnail">
		<img id="thumbnail" class="thumbnail" src={thumbnail} alt="Thumbnail">
	</div>
	<h2 id="title" class="subtitle player-title">Nothing is currently playing</h2>
	<div class="player-controls">
		<img id="previous" class="icon control-icon" src="../static/icons/previous.svg" alt="Previous" on:click={() => player.previous()}>
		<img id="pause"    class="icon control-icon" src="../static/icons/play.svg"     alt="Pause" on:click={() => player.pause()}>
		<img id="stop"     class="icon control-icon" src="../static/icons/stop.svg"     alt="Stop" on:click={() => player.destroy()}>
		<img id="next"     class="icon control-icon" src="../static/icons/next.svg"     alt="Next" on:click={() => player.skip()}>
	</div> <br /><br /><br />
	<div class="position-bar">
		<div class="bar"></div>
		<div id="progress-bar" class="bar-overlay"></div>
		<p id="ct" class="current-time">00:00</p>
		<p> / </p>
		<p id="sl" class="song-length">00:00</p>
	</div>
</footer>

<!-- </main> -->