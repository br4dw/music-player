import App from './App.svelte';
const fs = window.require('fs');

const configPath = './src/config.json';
const defaultConfig = {
	path: null,
	files: []
}

fs.access(configPath, fs.F_OK, (accessError) => {
	if (accessError) {
		console.log('No config file found... Creating one')
		return fs.writeFile(configPath, JSON.stringify(defaultConfig), (writeError) => {
			if (writeError) {
				return console.error(writeError)
			}
		});
	}
})

// let config = fs.readFile(configPath, (error, data) => {
// 	if (error) {
// 		console.error(error)
// 		return defaultConfig;
// 	}
// 	return JSON.parse(data);
// })

const app = new App({
	target: document.body,
	props: { config: window.require(process.cwd() + '\\src\\config.json') }
});

export default app;