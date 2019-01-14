#!/usr/bin/env node

const argv = require('mri')(
    process.argv.slice(2),
    require( './config/mri.json' )
);

/** @namespace argv.help */
if ( argv.help ) {
    const help = require('./config/help.json');

    console.log(
        help.format,
        help.usage,
        help.options.join('\n\t')
    );

    process.exit(0);
}

/** @namespace argv._ */
if ( ! argv._.length ) {
    console.warn('Base URL is needed');

    process.exit(1);
}

require('./lib/app')(argv);
