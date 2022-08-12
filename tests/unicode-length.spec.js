process.env['NODE_DEV'] = 'TEST'
var test = require('tape')
var unicodeLength = require('../lib/unicode-length')
var ansiCodes = require('./fixtures/ansi-codes')

const consumptionCharacters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_+1234567890-=[]{};\':"./>?,<\\|'

test('.get(): should throw if no input', function (t) {
  t.throws(function () {
    unicodeLength.get(null)
  }, /Missing input/)

  t.end()
})

test('.get(): should throw if input is not a string', function (t) {
  t.throws(function () {
    unicodeLength.get(123)
  }, /Invalid input: 123/)

  t.end()
})

test('.get(): should return zero if empty string', function (t) {
  t.equal(unicodeLength.get(''), 0)

  t.end()
})

test('.get(): should return the correct length of a string containing unicode symbols', function (t) {
  const result = unicodeLength.get('汉字')
  t.equal(result, 2)

  t.end()
})

test('.get(): should return the correct length of a string containing unicode symbols and colors', function (t) {
  const result = unicodeLength.get('\u001b[32m?\u001b[39m \u001b[1mWhat\'s your first name:\u001b[22m ')
  t.equal(result, 26)

  t.end()
})

test('.ansiRegex(): match ansi code in a string', function (t) {
  t.ok(unicodeLength.ansiRegex().test('foo\u001B[4mcake\u001B[0m'))
  t.ok(unicodeLength.ansiRegex().test('\u001B[4mcake\u001B[0m'))
  t.ok(unicodeLength.ansiRegex().test('foo\u001B[4mcake\u001B[0m'))
  t.ok(unicodeLength.ansiRegex().test('\u001B[0m\u001B[4m\u001B[42m\u001B[31mfoo\u001B[39m\u001B[49m\u001B[24mfoo\u001B[0m'))
  t.ok(unicodeLength.ansiRegex().test('foo\u001B[mfoo'))

  t.end()
})

test('.ansiRegex(): match ansi code from ls command', function (t) {
  t.ok(unicodeLength.ansiRegex().test('\u001B[00;38;5;244m\u001B[m\u001B[00;38;5;33mfoo\u001B[0m'))

  t.end()
})

test('.ansiRegex(): match reset;setfg;setbg;italics;strike;underline sequence in a string', function (t) {
  t.ok(unicodeLength.ansiRegex().test('\u001B[0;33;49;3;9;4mbar\u001B[0m'))
  t.is('foo\u001B[0;33;49;3;9;4mbar'.match(unicodeLength.ansiRegex())[0], '\u001B[0;33;49;3;9;4m')

  t.end()
})

test('.ansiRegex(): match clear tabs sequence in a string', function (t) {
  t.ok(unicodeLength.ansiRegex().test('foo\u001B[0gbar'))
  t.is('foo\u001B[0gbar'.match(unicodeLength.ansiRegex())[0], '\u001B[0g')

  t.end()
})

test('.ansiRegex(): match clear line from cursor right in a string', function (t) {
  t.ok(unicodeLength.ansiRegex().test('foo\u001B[Kbar'))
  t.is('foo\u001B[Kbar'.match(unicodeLength.ansiRegex())[0], '\u001B[K')

  t.end()
})

test('.ansiRegex(): match clear screen in a string', function (t) {
  t.ok(unicodeLength.ansiRegex().test('foo\u001B[2Jbar'))
  t.is('foo\u001B[2Jbar'.match(unicodeLength.ansiRegex())[0], '\u001B[2J')

  t.end()
})

test('.ansiRegex(): match terminal link', function (t) {
  t.ok(unicodeLength.ansiRegex().test('\u001B]8;k=v;https://example-a.com/?a_b=1&c=2#tit%20le\u0007click\u001B]8;;\u0007'))
  t.ok(unicodeLength.ansiRegex().test('\u001B]8;;mailto:no-replay@mail.com\u0007mail\u001B]8;;\u0007'))
  t.deepEqual('\u001B]8;k=v;https://example-a.com/?a_b=1&c=2#tit%20le\u0007click\u001B]8;;\u0007'.match(unicodeLength.ansiRegex()), [
    '\u001B]8;k=v;https://example-a.com/?a_b=1&c=2#tit%20le\u0007',
    '\u001B]8;;\u0007'
  ])
  t.deepEqual('\u001B]8;;mailto:no-reply@mail.com\u0007mail-me\u001B]8;;\u0007'.match(unicodeLength.ansiRegex()), [
    '\u001B]8;;mailto:no-reply@mail.com\u0007',
    '\u001B]8;;\u0007'
  ])

  t.end()
})

test('.ansiRegex(): match "change icon name and window title" in string', function (t) {
  t.is('\u001B]0;sg@tota:~/git/\u0007\u001B[01;32m[sg@tota\u001B[01;37m misc-tests\u001B[01;32m]$'.match(unicodeLength.ansiRegex())[0], '\u001B]0;sg@tota:~/git/\u0007')

  t.end()
})

// Testing against extended codes (excluding codes ending in 0-9)
for (var i = 0; i < ansiCodes.length; i++) {
  const codes = ansiCodes[i[0]]
  for (var j = 0; j < codes.length; j++) {
    const skip = /\d$/.test(codes[0])
    const skipText = skip ? '[SKIP] ' : ''
    const ecode = '\u001B' + codes[0]

    test('.ansiRegex(): ' + ansiCodes[i[0]] + ' - ' + skipText + codes[0] + ' → ' + codes[1][0], function (t) {
      if (skip) {
        t.pass()
        return
      }

      const string = 'hel' + ecode + 'lo'
      t.ok(unicodeLength.ansiRegex().test(string))
      t.is(string.match(unicodeLength.ansiRegex())[0], ecode)
      t.is(string.replace(unicodeLength.ansiRegex(), ''), 'hello')

      t.end()
    })

    test('.ansiRegex(): ' + ansiCodes[i[0]] + ' - ' + skipText + codes[0] + ' should not overconsume', function (t) {
      if (skip) {
        t.pass()
        return
      }

      for (var k = 0; k < consumptionCharacters.length; k++) {
        const string = ecode + consumptionCharacters[k]
        t.ok(unicodeLength.ansiRegex().test(string))
        t.is(string.match(unicodeLength.ansiRegex())[0], ecode)
        t.is(string.replace(unicodeLength.ansiRegex(), ''), consumptionCharacters[k])
      }

      t.end()
    })
  }
}
