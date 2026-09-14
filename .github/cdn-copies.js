// Regenerates the dist/cdn copies that ship in the npm tarball.
//
// The release harness (jquery-release) calls makeReleaseCopies() in
// build/release.js to produce dist/cdn before publishing, so those files are
// part of the published package but are not produced by `grunt`. This script
// is that function, standalone, so CI can produce them with plain node and no
// dependencies. Keep it in sync with build/release.js.

var fs = require( "fs" ),
	path = require( "path" ),

	version = require( "../package.json" ).version,

	devFile = "dist/jquery.js",
	minFile = "dist/jquery.min.js",
	mapFile = "dist/jquery.min.map",

	cdnFolder = "dist/cdn",

	releaseFiles = {
		"jquery-VER.js": devFile,
		"jquery-VER.min.js": minFile,
		"jquery-VER.min.map": mapFile,
		"jquery.js": devFile,
		"jquery.min.js": minFile,
		"jquery.min.map": mapFile,
		"jquery-latest.js": devFile,
		"jquery-latest.min.js": minFile,
		"jquery-latest.min.map": mapFile
	};

process.chdir( path.join( __dirname, ".." ) );

if ( !fs.existsSync( cdnFolder ) ) {
	fs.mkdirSync( cdnFolder );
}

Object.keys( releaseFiles ).forEach(function( key ) {
	var text,
		builtFile = releaseFiles[ key ],
		unpathedFile = key.replace( /VER/g, version ),
		releaseFile = cdnFolder + "/" + unpathedFile;

	if ( /\.map$/.test( releaseFile ) ) {

		// Map files need to reference the new uncompressed name;
		// assume that all files reside in the same directory.
		// "file":"jquery.min.js","sources":["jquery.js"]
		text = fs.readFileSync( builtFile, "utf8" )
			.replace( /"file":"([^"]+)","sources":\["([^"]+)"\]/,
				"\"file\":\"" + unpathedFile.replace( /\.min\.map/, ".min.js" ) +
				"\",\"sources\":[\"" + unpathedFile.replace( /\.min\.map/, ".js" ) + "\"]" );
		fs.writeFileSync( releaseFile, text );

	} else if ( /\.min\.js$/.test( releaseFile ) ) {

		// Remove the source map comment; it causes way too many problems.
		// Keep the map file in case DevTools allow manual association.
		text = fs.readFileSync( builtFile, "utf8" )
			.replace( /\/\/# sourceMappingURL=\S+/, "" );
		fs.writeFileSync( releaseFile, text );

	} else if ( builtFile !== releaseFile ) {
		fs.writeFileSync( releaseFile, fs.readFileSync( builtFile ) );
	}

	console.log( "File '" + releaseFile + "' created." );
});
