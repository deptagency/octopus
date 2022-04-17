<p align="center">
    <img src="https://raw.githubusercontent.com/deptagency/octopus/master/octopus.png" width="128" height="128" alt="Octopus">
    <br>
    <br>
    <b>Octopus</b>
    <br>
    Quickly crawl a whole website for broken links
</p>


### Install

```bash
npm install --global @deptagency/octopus
```

*or*

```bash
yarn global add @deptagency/octopus
```


### Usage

```bash
octopus <domain> [options]
```


### Options

Option | Description | Default
------ | ----------- | -------
`--ignore-query` | Ignore a query string | `false`
`--ignore-external` | Ignore all external links | `false`
`--ignore-nofollow` | Ignore `rel=nofollow` links | `false`
`--ignore-list` | A JSON file that contains a list list of URLs and domains to be ignored | `none`
`--include-images` | Check `<img>` elements | `false`
`--slack-webhook` | Slack incoming webhook url | `none`
`--timeout` | Time to wait for response | `5000`
`--silent` | Run without printing progress line | `false`
`--help` | Output help text |  

The `--ignore-list` option must contain a path to a `JSON` file that includes
URLs and domains to be ignored. The `JSON` object must have two properties:
`urls` and `domains`. They both have an array of strings as a value, for example:

```
{
   "urls":[
      "https://www.example.com/path/",
      "https://foo.com/2"
   ],
   "domains":[
      "bar.com",
      "www.mydomain.org"
   ]
}
```

### Examples

```bash
octopus www.deptagency.com
octopus www.awg-mode.de --ignore-external
octopus www.hardeck.de --ignore-query=isEnergyEfficiencyChartOpen --ignore-query=followSearch
octopus www.golfino.com --silent --slack-webhook=https://hooks.slack.com/services/XXX/XXX/XXX
octopus example.com --ignore-list=exclude.json
```


### Icon
Made by [Freepik](https://www.freepik.com) from [www.flaticon.com](https://www.flaticon.com)
