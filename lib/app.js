/**
 * Octopus module
 * @module lib/app
 */


/**
 * Required modules
 */
const got = require('got');
const { EOL } = require('os');
const async = require('async');
const { URL } = require('url');
const justify = require('justify');
const prettyMs = require('pretty-ms');
const prependHttp = require('prepend-http');
const cheerioLoad = require('cheerio')['load'];
const differenceBy = require('lodash.differenceby');
const windowWidth = require('term-size')()['columns'];
const fs = require('fs');

/**
 * App defaults
 */
let config;
let baseUrl;
let baseHost;
let crawledLinks = [];
let inboundLinks = [];
let brokenLinks = [];
let ignoreUrls = [];
let ignoreDomains = [];

/**
 * CLI colors
 */
const COLOR_GRAY = '\x1b[90m';
const COLOR_GREEN = '\x1b[32m';
const COLOR_RED = '\x1b[31m';
const FORMAT_END = '\x1b[0m';

/**
 * App timing
 */
const NS_PER_SEC = 1e9;
const MS_PER_NS = 1e-6;
const executionTime = process.hrtime();

/**
 * Blacklisted protocols
 */
const ignoreProtocols = [
    '[href^="javascript:"]',
    '[href^="mailto:"]',
    '[href^="telnet:"]',
    '[href^="file:"]',
    '[href^="news:"]',
    '[href^="tel:"]',
    '[href^="ftp:"]',
    '[href^="#"]'
];

/**
 * Output line length
 */
const maxLength = windowWidth - 20;

/**
 * Console streaming
 */
require('draftlog').into(console);
console.stream = console.draft(EOL);

/**
 * Read ignored URLs and domains from a JSON file
 */
const readIgnoreFile = () => {
    const filePath = config['ignore-list'];
    if (fs.existsSync(filePath)) {
        try {
            let rawdata = fs.readFileSync(filePath);
            let json = JSON.parse(rawdata);
            ignoreUrls = json.urls ? json.urls : [];
            ignoreDomains = json.domains ? json.domains : [];
        } catch ( error ) {
            console.log(
                justify('❌', null, 1),
                COLOR_RED,
                `ERROR: Invalid JSON object in "${filePath}" configuration file`,
                FORMAT_END
            );
            process.exit(1);
        }
    }
};

/**
 * Magic function for the brokenLinks object
 */
const brokenLinksObserver = new Proxy(brokenLinks, {
    set: function(target, key, value) {

        // Extract variables
        const {requestUrl, referenceUrl, statusMessage, statusCode} = value;

        // Push to object
        target.push(requestUrl);

        // Terminal output
        console.log(
            '%s%s%s%s%s: %s%s%s: %s (%d)%s',
            justify('⚠️', null, 5),
            requestUrl.substr(0, maxLength),
            EOL,

            COLOR_GRAY,
            justify(null, 'APPEARS ON', 14),
            referenceUrl.substr(0, maxLength),
            EOL,

            justify(null,'STATUS MSG', 14),
            statusMessage,
            statusCode,
            FORMAT_END
        );

        // Slack notification
        config['slack-webhook'] && got( config['slack-webhook'], {
            method: 'POST',
            body: JSON.stringify({
                "attachments": [
                    {
                        "fallback": `Broken url: ${requestUrl}${EOL}Appears on: ${referenceUrl}${EOL}Status msg: ${statusMessage} (${statusCode})`,
                        "fields": [
                            {
                                "title": "Broken url",
                                "value": requestUrl,
                            },
                            {
                                "title": "Appears on",
                                "value": referenceUrl,
                            },
                            {
                                "title": "Status code",
                                "value": statusCode,
                                "short": true
                            },
                            {
                                "title": "Status message",
                                "value": statusMessage,
                                "short": true
                            }
                        ],
                        "color": "danger"
                    }
                ]
            })
        } );
    }
} );


/**
 * Executes the URL request
 * @param {String} requestUrl - URL of the requested link
 * @param {String} referenceUrl - URL of the reference page
 * @param {Function} requestCallback - Callback function
 * @returns {Function} Callback function
 */
const request = async (requestUrl, referenceUrl, requestCallback) => {

    // Encode Url
    const encodedUrl = requestUrl.match(/%[0-9a-f]{2}/i) ? requestUrl : encodeURI(requestUrl);

    try {
        // Start request
        const response = await got( encodedUrl, {
            timeout: config.timeout,
            headers: {
                'user-agent': 'Octopus'
            }
        } );

        // Extract response data
        const { statusCode, statusMessage, headers, timings, body } = response;
        const contentType = headers['content-type'];

        // Parse url
        const parsedUrl = new URL(requestUrl);

        // Default
        let pageLinks = [];

        // Update stream
        if ( ! config.silent ) {
            console.stream(
                '%s%s %s(%d ms)%s',
                justify('🤖', null, 4),
                requestUrl.substr(0, maxLength),
                COLOR_GRAY,
                timings['phases'].total,
                FORMAT_END
            );
        }

        // Check for status code
        if ( ! [200, 204].includes(statusCode) ) {
            if ( ! brokenLinks.includes(requestUrl) ) {
                brokenLinksObserver[brokenLinks.length] = {
                    requestUrl,
                    referenceUrl,
                    statusCode,
                    statusMessage
                };
            }

        // Extract links only from internal HTML pages
        } else if ( parsedUrl.host === baseHost && contentType.startsWith('text/html') ) {
            const $ = cheerioLoad(body);

            $('a[href]').not( ignoreProtocols.join(',') ).each( (i, elem) => {
                if (elem.attribs.href) {
                    const hrefUrl = new URL(elem.attribs.href, baseUrl).href;

                    if ( ! pageLinks.includes(hrefUrl) ) {
                        pageLinks.push(hrefUrl);
                    }
                }
            });

            if ( config['include-images'] ) {
                $('img[src]').each((i, elem) => {
                    if (elem.attribs.src) {
                        const srcUrl = new URL(elem.attribs.src, baseUrl).href;

                        if (!pageLinks.includes(srcUrl)) {
                            pageLinks.push(srcUrl);
                        }
                    }
                });
            }
        }

        // Execute callback
        return requestCallback(requestUrl, pageLinks);

    } catch ( error ) {

        // Add to broken links on request error
        if ( ! brokenLinks.includes(requestUrl) ) {
            const statusCode = error.statusCode || '';
            const statusMessage = ( error.code || error.statusMessage ).toUpperCase();

            brokenLinksObserver[brokenLinks.length] = {
                requestUrl,
                referenceUrl,
                statusCode,
                statusMessage
            };
        }

        // Execute callback
        return requestCallback(requestUrl, []);

    }

};


/**
 * Starts the page crawling
 * @param {String} crawlUrl - URL of the crawled page
 * @param {String} [referenceUrl] - URL of the reference page
 * @returns {Promise} Promise object represents the crawling request
 */
const crawl = ( crawlUrl, referenceUrl = '' ) => {

    return request( crawlUrl, referenceUrl, (requestUrl, pageLinks) => {

        // Mark url as crawled
        crawledLinks.push( {
            'requestUrl': requestUrl
        } );

        // Async loop
        async.eachSeries( pageLinks, (pageLink, crawlCallback) => {

            // Parse url
            const parsedLink = new URL(pageLink);
            if (
                ( ! config['ignore-external'] || ( config['ignore-external'] && parsedLink.host === baseHost ) ) &&
                ( ! parsedLink.searchParams || ( parsedLink.searchParams && ! config['ignore-query'].filter(query => parsedLink.searchParams.get(query)).length ) ) &&
                ( ! inboundLinks.filter(item => item.requestUrl === pageLink).length )  &&
                ( ! ignoreUrls.filter(item => item === pageLink).length ) &&
                ( ! ignoreDomains.filter(item => item === parsedLink.host).length )
            ) {
                inboundLinks.push( {
                    'referenceUrl': requestUrl,
                    'requestUrl': pageLink
                } );
            }

            crawlCallback();

        }, () => {

            // Evaluate links to crawl
            const nextUrls = differenceBy( inboundLinks, crawledLinks, 'requestUrl' );

            // Stream and check next link
            if ( Object.getOwnPropertyNames(nextUrls).length > 1 ) {
                return crawl( nextUrls[0].requestUrl, nextUrls[0].referenceUrl );

            // Nothing to check, log & exit
            } else {
                const diff = process.hrtime(executionTime);
                const ms = (diff[0] * NS_PER_SEC + diff[1]) * MS_PER_NS;

                console.log(
                    '%s%s%s%d %s %s%s',
                    EOL,
                    COLOR_GREEN,
                    justify('✅', null, 3),
                    inboundLinks.length,
                    'links checked in',
                    prettyMs( ms, { compact: true } ),
                    FORMAT_END
                );

                process.exit( 0 );
            }

        } );

    } );

};


/**
 * Initializes the website crawling
 * @param {Object} argv - CLI arguments provided from mri package
 * @returns {Promise} Promise object represents the crawling loop
 */
module.exports = (argv) => {

    // Config
    config = {
        'timeout': Number(argv.timeout),
        'silent': Boolean(argv['silent']),
        'ignore-query': (Array.isArray(argv['ignore-query']) ? argv['ignore-query'] : Array(argv['ignore-query'])),
        'ignore-external': Boolean(argv['ignore-external']),
        'include-images': Boolean(argv['include-images']),
        'slack-webhook': String(argv['slack-webhook']),
        'ignore-list': String(argv['ignore-list']),
    };

    // Skip nofollow links
    if ( argv['ignore-nofollow'] ) {
        ignoreProtocols.push('[rel~="nofollow"]');
    }

    // Read ignore list
    if ( argv['ignore-list'] ) {
        readIgnoreFile();
    }

    // Base data
    baseUrl = prependHttp(argv._[0], {https: true});
    baseHost = new URL(baseUrl).host;

    // Fire!
    return crawl(baseUrl);

};
