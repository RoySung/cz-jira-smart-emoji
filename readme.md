# cz-jira-smart-emoji

> Commitizen adapter formatting commit messages using emojis and jira smart commits

**cz-jira-smart-emoji** allows you to easily use emojis in your commits using [commitizen].

```sh
? Select the type of change you are committing: (Use arrow keys)
❯ feature   🌟  A new feature
  fix       🐞  A bug fix
  docs      📚  Documentation change
  refactor  🎨  A code refactoring change
  chore     🔩  A chore change
```

## Install

**Globally**

```bash
npm install --global cz-jira-smart-emoji

# set as default adapter for your projects
echo '{ "path": "cz-jira-smart-emoji" }' > ~/.czrc
```

**Locally**

```bash
npm install --save-dev cz-emoji
```

Add this to your `package.json`:

```json
"config": {
  "commitizen": {
    "path": "cz-jira-smart-emoji"
  }
}
```

## Usage

```sh
$ git cz
```

## Customization

By default `cz-jira-smart-emoji` comes ready to run out of the box. Uses may vary, so there are a few configuration options to allow fine tuning for project needs.

### How to

Configuring `cz-jira-smart-emoji` can be handled in the users home directory (`~/.czrc`) for changes to impact all projects or on a per project basis (`package.json`). Simply add the config property as shown below to the existing object in either of the locations with your settings for override.

```json
{
  "config": {
    "cz-jira-smart-emoji": {}
  }
}
```

### Configuration Options

#### Types

By default `cz-jira-smart-emoji` comes preconfigured with the [Gitmoji](https://gitmoji.carloscuesta.me/) types.

An [Inquirer.js] choices array:

```json
{
  "config": {
    "cz-jira-smart-emoji": {
      "types": [
        {
          "emoji": "🌟",
          "code": ":star2:",
          "description": "A new feature",
          "name": "feature"
        }
      ]
    }
  }
}
```

#### Workflows

An [Inquirer.js] choices array:

```json
{
  "config": {
    "cz-emoji": {
      "workflows": [{"name": "testing", "value":"testing"}]
    }
  }
}
```


## Examples

- https://github.com/Falieson/TRAM

[commitizen]: https://github.com/commitizen/cz-cli
[inquirer.js]: https://github.com/SBoudrias/Inquirer.js/
