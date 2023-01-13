const fs = require('fs')
const readPkg = require('read-pkg-up')
const truncate = require('cli-truncate')
const wrap = require('wrap-ansi')
const pad = require('pad')
const path = require('path')
const fuse = require('fuse.js')
const homeDir = require('home-dir')
const util = require('util')
const { exec } = require('child_process');
const execProm = util.promisify(exec);

const types = require('./lib/types')

const defaultConfig = {
  types,
  workflows:[],
  projectDir: '~/workspace/hanger',
  symbol: false,
  skipQuestions: [''],
  subjectMaxLength: 75,
  conventional: false
}

let jiraTicket;

async function getGitBranch(){
  const jiraMatcher = /((?!([A-Z0-9a-z]{1,10})-?$)[A-Z]{1}[A-Z0-9]+-\d+)/g;
  const branch = await execProm('git rev-parse --abbrev-ref HEAD')
  const jiraTickets = branch.stdout.match(jiraMatcher);
  return jiraTickets ? jiraTickets[jiraTickets.length - 1] : 'no jira ticket';
}

function getEmojiChoices({ types, symbol }) {
  const maxNameLength = types.reduce(
    (maxLength, type) => (type.name.length > maxLength ? type.name.length : maxLength),
    0
  )

  return types.map(choice => ({
    name: `${pad(choice.name, maxNameLength)}  ${choice.emoji}  ${choice.description}`,
    value: {
      emoji: symbol ? `${choice.emoji} ` : choice.code,
      name: choice.name
    },
    code: choice.code
  }))
}



async function loadConfig() {
  jiraTicket = await getGitBranch()
  const getConfig = obj => obj && obj.config

  const readFromCzrc = dir =>
    util
      .promisify(fs.readFile)(dir, 'utf8')
      .then(JSON.parse, () => null)
      .then(getConfig)

  const readFromLocalCzrc = () =>
    readPkg().then(res =>
      res && res.path ? readFromCzrc(`${path.dirname(res.path)}/.czrc`) : null
    )

  const config = (await readFromLocalCzrc())

  return { ...defaultConfig, ...config }
}

function formatScope(scope) {
  return scope ? `(${scope})` : ''
}

function formatHead({ type, scope, issues, workflow, subject, time, comment }, config) {
  const prelude = config.conventional
    ? `${type.name}${formatScope(scope)}: ${type.emoji}`
    : `${type.emoji} ${formatScope(scope)} `
  return `${prelude} ${subject}`
}

function formatBody({ issues, workflow, body, time, comment }, config) {
  const smartText = filter([
    workflow && workflow != '[NONE]' ? '#' + workflow : undefined,
    time ? '#time ' + time : undefined,
    comment ? '#comment ' + comment : undefined,
  ]).join(` `);
  return `${body} \n ${formatLineItem(issues, smartText)}`
}

function formatLineItem(issues, line) {
  return `${issues} ${line}`
}

function filter(array) {
  return array.filter(function(item) {
    return !!item;
  });
}

/**
 * Create inquier.js questions object trying to read `types` and `scopes` from the current project
 * `package.json` falling back to nice default :)
 *
 * @param {Object} config Result of the `loadConfig` returned promise
 * @return {Array} Return an array of `inquier.js` questions
 * @private
 */
function createQuestions(config) {
  const choices = getEmojiChoices(config)
  const workflows = [{name:'[NONE]',value:'[NONE]'}, ...config.workflows]
  const fuzzyOptions = {
    shouldSort: true,
    threshold: 0.4,
    location: 0,
    distance: 100,
    maxPatternLength: 32,
    minMatchCharLength: 1,
    keys: ['name', 'code']
  }

  const fuzzyEmojis = new fuse(choices, fuzzyOptions)
  const fuzzyWorkflows = new fuse(workflows, fuzzyOptions)

  const questions = [
    {
      type: 'autocomplete',
      name: 'type',
      message:
        config.questions && config.questions.type
          ? config.questions.type
          : "Select the type of change you're committing:",
      source: (_, query) => Promise.resolve(query ? fuzzyEmojis.search(query) : choices)
    },
    {
      type: config.scopes ? 'list' : 'input',
      name: 'scope',
      message: 'Specify a scope:',
      when: !config.skipQuestions.includes('scope')
    },
    {
      type: 'input',
      name: 'issues',
      message: 'Jira Issue ID(s):',
      default: jiraTicket,
      validate: function(input) {
        if (!input) {
          return 'Must specify issue IDs';
        } else {
          return true;
        }
      }
    },
    {
      type: 'input',
      name: 'time',
      message: 'Time spent (i.e. 3h 15m):'
    },
    {
      type: 'input',
      name: 'comment',
      message: 'Jira comment:'
    },
    {
      type: 'autocomplete',
      name: 'workflow',
      message: 'Workflow command:',
      source: (_, query) => Promise.resolve(query ? fuzzyWorkflows.search(query) : workflows)
    },
    {
      type: 'maxlength-input',
      name: 'subject',
      message: 'Write a short description:',
      maxLength: config.subjectMaxLength,
      filter: (subject, answers) => formatHead({ ...answers, subject }, config)
    },
    {
      type: 'input',
      name: 'body',
      message: 'Provide a longer description:',
      when: !config.skipQuestions.includes('body'),
      filter: (body, answers) => formatBody({ ...answers, body }, config)
    }
  ]

  return questions
}

/**
 * Format the git commit message from given answers.
 *
 * @param {Object} answers Answers provide by `inquier.js`
 * @return {String} Formated git commit message
 */
function format(answers) {
  const { columns } = process.stdout

  const head = truncate(answers.subject, columns)
  const body = wrap(answers.body || '', columns)

  return [head, body]
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

/**
 * Export an object containing a `prompter` method. This object is used by `commitizen`.
 *
 * @type {Object}
 */
module.exports = {
  prompter: function(cz, commit) {
    cz.prompt.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'))
    cz.prompt.registerPrompt('maxlength-input', require('@matti-o7/inquirer-maxlength-input-prompt'))

    loadConfig()
      .then(createQuestions)
      .then(cz.prompt)
      .then(format)
      .then(commit)
  }
}
