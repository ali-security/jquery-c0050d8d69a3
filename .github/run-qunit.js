// Headless runner for the jQuery QUnit suite.
//
// The 1.11.x suite only ships a browser harness (test/index.html), so CI has
// no way to execute it from node. This PhantomJS script loads that page over
// HTTP, hooks QUnit's testDone/done callbacks and reports the results on
// stdout, exiting non-zero when any assertion fails.
//
// Usage: phantomjs .github/run-qunit.js <url>

/* global phantom: false */

var system = require( "system" ),
	page = require( "webpage" ).create(),
	url = system.args[ 1 ],

	// The full suite is several thousand assertions; allow generous head room
	// but never hang the CI job.
	timeout = 10 * 60 * 1000,

	started = Date.now(),
	modules = {},
	tests = 0,
	finished = false;

if ( !url ) {
	console.log( "Usage: phantomjs run-qunit.js <url>" );
	phantom.exit( 1 );
}

// Installed into every frame before any page script runs, so the hooks are in
// place by the time QUnit is defined.
page.onInitialized = function() {
	page.evaluate( function() {
		var poll = setInterval( function() {
			if ( !window.QUnit || !window.QUnit.testDone || !window.callPhantom ) {
				return;
			}
			clearInterval( poll );

			window.QUnit.testDone( function( result ) {
				window.callPhantom({
					event: "testDone",
					module: result.module,
					name: result.name,
					failed: result.failed,
					passed: result.passed,
					total: result.total
				});
			});

			window.QUnit.done( function( result ) {
				window.callPhantom({
					event: "done",
					failed: result.failed,
					passed: result.passed,
					total: result.total,
					runtime: result.runtime
				});
			});
		}, 25 );
	});
};

page.onCallback = function( data ) {
	if ( data.event === "testDone" ) {
		tests++;
		if ( data.failed > 0 ) {
			console.log( "FAIL " + data.module + ": " + data.name +
				" (" + data.failed + "/" + data.total + " assertions failed)" );
		} else {
			modules[ data.module ] = ( modules[ data.module ] || 0 ) + 1;
		}
		// Keep the Travis log flowing so the no-output timeout never trips.
		if ( tests % 100 === 0 ) {
			console.log( "... " + tests + " tests executed" );
		}
		return;
	}

	if ( data.event === "done" ) {
		finished = true;
		Object.keys( modules ).sort().forEach( function( name ) {
			console.log( "ok   " + name + ": " + modules[ name ] + " tests passed" );
		});
		console.log( "" );
		console.log( "Tests executed: " + tests );
		console.log( "Assertions: " + data.total +
			" total, " + data.passed + " passed, " + data.failed + " failed" );
		console.log( "Runtime: " + data.runtime + "ms" );
		console.log( data.failed > 0 ? "QUNIT FAILED" : "QUNIT PASSED" );
		phantom.exit( data.failed > 0 ? 1 : 0 );
	}
};

page.onError = function( msg ) {
	console.log( "PAGE ERROR: " + msg );
};

setInterval( function() {
	if ( !finished && Date.now() - started > timeout ) {
		console.log( "QUNIT TIMED OUT after " + timeout + "ms (" + tests + " tests executed)" );
		phantom.exit( 1 );
	}
}, 5000 );

console.log( "Opening " + url );
page.open( url, function( status ) {
	if ( status !== "success" ) {
		console.log( "Unable to open " + url );
		phantom.exit( 1 );
	}
	console.log( "Page loaded, running suite" );
});
