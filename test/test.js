/**
 * Required modules
 */
require('must/register');
const exec = require( 'child-process-promise' ).exec;
const playgroundUrl = require( './../config/test.json' ).playgroundUrl;


describe( 'Octopus Playground', () => {

    it( `octopus ${playgroundUrl} --silent`, done => {

        exec( `octopus ${playgroundUrl} --silent` ).then( result => {

            const data = result.stdout.trim();

            data.must.include( 'https://blablubblablub.de/' );
            data.must.include( 'STATUS MSG: ENOTFOUND (0)' );

            data.must.include( 'https://static-pages.sr-lab.de/kunden/public/github/octopus/one.html' );
            data.must.include( 'https://static-pages.sr-lab.de/kunden/public/github/octopus/two.html?continue=1' );
            data.must.include( 'APPEARS ON: https://static-pages.sr-lab.de/kunden/public/github/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '6 links checked' );

            done();

        } )

    } );


    it( `octopus ${playgroundUrl} --silent --ignore-query=continue`, done => {

        exec( `octopus ${playgroundUrl} --silent --ignore-query=continue` ).then( result => {

            const data = result.stdout.trim();

            data.must.include( 'https://blablubblablub.de/' );
            data.must.include( 'STATUS MSG: ENOTFOUND (0)' );

            data.must.include( 'https://static-pages.sr-lab.de/kunden/public/github/octopus/one.html' );
            data.must.include( 'APPEARS ON: https://static-pages.sr-lab.de/kunden/public/github/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '5 links checked' );

            done();

        } )

    } );


    it( `octopus ${playgroundUrl} --silent --ignore-external`, done => {

        exec( `octopus ${playgroundUrl} --silent --ignore-external` ).then( result => {

            const data = result.stdout.trim();

            data.must.not.include( 'https://blablubblablub.de/' );
            data.must.not.include( 'STATUS MSG: ENOTFOUND (0)' );

            data.must.include( 'https://static-pages.sr-lab.de/kunden/public/github/octopus/one.html' );
            data.must.include( 'https://static-pages.sr-lab.de/kunden/public/github/octopus/two.html?continue=1' );
            data.must.include( 'APPEARS ON: https://static-pages.sr-lab.de/kunden/public/github/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '3 links checked' );

            done();

        } )

    } );


    it( `octopus ${playgroundUrl} --silent --ignore-nofollow`, done => {

        exec( `octopus ${playgroundUrl} --silent --ignore-nofollow` ).then( result => {

            const data = result.stdout.trim();

            data.must.include( 'https://blablubblablub.de/' );
            data.must.include( 'STATUS MSG: ENOTFOUND (0)' );
            data.must.include( 'https://static-pages.sr-lab.de/kunden/public/github/octopus/one.html' );
            data.must.include( 'APPEARS ON: https://static-pages.sr-lab.de/kunden/public/github/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.not.include( 'https://static-pages.sr-lab.de/kunden/public/github/octopus/two.html?continue=1' );

            data.must.include( '4 links checked' );

            done();

        } )

    } );

    it( `octopus ${playgroundUrl} --silent --include-images`, done => {

        exec( `octopus ${playgroundUrl} --silent --include-images` ).then( result => {

            const data = result.stdout.trim();

            data.must.include( 'https://www.deptagency.com/wp-content/uploads/fly.jpeg' );
            data.must.include( 'APPEARS ON: https://static-pages.sr-lab.de/kunden/public/github/octopus/' );
            data.must.include( 'STATUS MSG: NOT FOUND (404)' );

            data.must.include( '8 links checked' );

            done();

        } )

    } );

} );
