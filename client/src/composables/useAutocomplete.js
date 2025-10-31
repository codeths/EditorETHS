// Autocomplete patterns for HTML, CSS, and JavaScript

export const autocompletePatterns = {
  // HTML Boilerplate
  '<!DOCTYPE html>': '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Document</title>\n</head>\n<body>\n    \n</body>\n</html>',

  // HTML Tags (self-closing)
  '<img>': '<img src="" alt="">',
  '<input>': '<input type="text">',
  '<link>': '<link rel="stylesheet" href="">',
  '<meta>': '<meta name="" content="">',
  '<br>': '<br>',
  '<hr>': '<hr>',

  // HTML Tags (with closing)
  '<div>': '<div>\n    \n</div>',
  '<p>': '<p></p>',
  '<a>': '<a href=""></a>',
  '<button>': '<button></button>',
  '<h1>': '<h1></h1>',
  '<h2>': '<h2></h2>',
  '<h3>': '<h3></h3>',
  '<span>': '<span></span>',
  '<ul>': '<ul>\n    <li></li>\n</ul>',
  '<ol>': '<ol>\n    <li></li>\n</ol>',
  '<table>': '<table>\n    <tr>\n        <td></td>\n    </tr>\n</table>',
  '<form>': '<form action="" method="post">\n    \n</form>',
  '<select>': '<select>\n    <option value=""></option>\n</select>',
  '<style>': '<style>\n    \n</style>',
  '<script>': '<script>\n    \n</script>',

  // CSS common patterns
  '@media': '@media screen and (max-width: 768px) {\n    \n}',
  '@keyframes': '@keyframes animationName {\n    0% { }\n    100% { }\n}',
  '@import': '@import url("");',
  'flexbox': 'display: flex;\njustify-content: center;\nalign-items: center;',
  'grid': 'display: grid;\ngrid-template-columns: repeat(auto-fit, minmax(200px, 1fr));\ngap: 20px;',

  // JavaScript patterns
  'function()': 'function name() {\n    \n}',
  'arrow': '() => {\n    \n}',
  'const': 'const name = ',
  'if()': 'if () {\n    \n}',
  'for()': 'for (let i = 0; i < length; i++) {\n    \n}',
  'foreach': 'array.forEach(item => {\n    \n});',
  'class': 'class ClassName {\n    constructor() {\n        \n    }\n}',
  'addEventListener': 'addEventListener("click", function(e) {\n    \n});',
  'fetch': 'fetch(url)\n    .then(response => response.json())\n    .then(data => {\n        \n    })\n    .catch(error => console.error(error));',
  'async': 'async function name() {\n    try {\n        \n    } catch (error) {\n        console.error(error);\n    }\n}',
  'tryCatch': 'try {\n    \n} catch (error) {\n    console.error(error);\n}',
}

// Check if pattern should trigger (on specific keys)
export function checkAutocompletePattern(value, cursorPos, key) {
  // Only check on closing characters
  if (!['>', ')', '}', '\n', ' '].includes(key)) {
    return null
  }

  const textBeforeCursor = value.substring(0, cursorPos)

  // Check each pattern
  for (const [trigger, completion] of Object.entries(autocompletePatterns)) {
    if (textBeforeCursor.endsWith(trigger)) {
      // Found a match!
      const beforeTrigger = textBeforeCursor.slice(0, -trigger.length)
      const afterCursor = value.substring(cursorPos)

      const newValue = beforeTrigger + completion + afterCursor

      // Calculate new cursor position intelligently
      let newPos
      if (completion.includes('\n    \n')) {
        // Position inside the indented area
        const indentPos = beforeTrigger.length + completion.indexOf('\n    \n') + 5
        newPos = indentPos
      } else if (completion.includes('""')) {
        // Position between quotes
        newPos = beforeTrigger.length + completion.indexOf('""') + 1
      } else if (completion.includes('()')) {
        // Position between parentheses
        newPos = beforeTrigger.length + completion.indexOf('()') + 1
      } else {
        // Position at end
        newPos = beforeTrigger.length + completion.length
      }

      return { newValue, newPos }
    }
  }

  return null
}
