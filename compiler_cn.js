/**
 * 标记程序：接收代码文本，输出标记的数组
 * @param {string} input 代码文本
 */
function tokenizer(input) {
  // 像光标一样标记在代码中的位置
  let current = 0;

  // 用于存放标记的数组
  let tokens = [];

  // 使用while循环遍历代码文本
  while (current < input.length) {
    // 获取“当前”位置上的字符
    let char = input[current];

    // 首先检测 '(' ，稍后在 `CallExpression` 会用到
    if (char === "(") {
      // 如果检测到 '(' ，则向 tokens 里面插入一条记录
      tokens.push({
        type: "paren",
        value: "(",
      });

      // `current` 递增
      current++;

      // 并跳出当次循环
      continue;
    }

    // 接下来检测 ')'，和上面一样的步骤
    if (char === ")") {
      tokens.push({
        type: "paren",
        value: ")",
      });
      current++;
      continue;
    }

    // 接着，需要检测空格，因为空格会隔开其他字符，但是并无其他含义所以无需作为一个token存储，因此当检测到空格的时候直接跳出当次循环即可
    let WHITESPACE = /\s/;
    if (WHITESPACE.test(char)) {
      current++;
      continue;
    }

    // 接着需要标记的是数字，数字的特殊之处在于我们需要将所有连续的数字整个作为一个token，这样才能保留这些数字在代码中的含义，比如：
    //
    //   (add 123 456)
    //        ^^^ ^^^
    //        123，456分别是一个token
    // 所以接下来获取连续的数字序列
    let NUMBERS = /[0-9]/;
    if (NUMBERS.test(char)) {
      // 存储检测到的连续数字序列
      let value = "";

      // 循环检测后续的字符是否为数字，直到检测到非数字的字符
      // 如果为数字则给 `value` 附加该数，并且 `current` 自增1
      while (NUMBERS.test(char)) {
        value += char;
        char = input[++current];
      }

      // 检测完一个连续数字序列，则生成一个token
      tokens.push({ type: "number", value });

      // 跳出当次循环
      continue;
    }

    // 同样的，我们增加对字符串的检测，判定双引号之间的内容为字符串
    //   (concat "foo" "bar")
    //            ^^^   ^^^ foo，bar分别是一个token
    // 首先检测左边的'"'
    if (char === '"') {
      // 存储字符串的内容
      let value = "";

      // 跳过左边的 "
      char = input[++current];

      // 遍历两个 " 之间的内容
      while (char !== '"') {
        value += char;
        char = input[++current];
      }

      // 跳过右边的 "
      char = input[++current];

      // 检测完一个字符串则生成一个token
      tokens.push({ type: "string", value });

      continue;
    }

    // 最后需要检测的token类型是 `name`，比如变量、函数的名称。本Demo中认为`name` 是一段连续的字母，比如：
    //
    //   (add 2 4)
    //    ^^^
    //    Name token
    //
    let LETTERS = /[a-z]/i;
    if (LETTERS.test(char)) {
      let value = "";

      // 遍历所有连续的字母
      while (LETTERS.test(char)) {
        value += char;
        char = input[++current];
      }

      // 检测完成生成token
      tokens.push({ type: "name", value });

      continue;
    }

    // 最后，如果当前字符没有符合条件的匹配，则报错并退出
    throw new TypeError("I dont know what this character is: " + char);
  }

  return tokens;
}

function parser(tokens) {
  // 依然使用current变量记录循环到的位置
  let current = 0;

  // 这次我们使用递归的方法去遍历
  // 定义一个walk方法
  function walk() {
    // 获取当前位置的token
    let token = tokens[current];

    // 将每种类型的token拆分到不同的代码路径中
    // 从number类型的开始
    if (token.type === "number") {
      // 每找到一个current递增
      current++;

      // 返回一个类型为 `NumberLiteral`，值为token。value的AST节点
      return {
        type: "NumberLiteral",
        value: token.value,
      };
    }

    // string类型同理
    if (token.type === "string") {
      current++;
      return {
        type: "StringLiteral",
        value: token.value,
      };
    }

    // 接下来，查找调用表达式（CallExpression），从找到 `(` 开始
    if (token.type === "paren" && token.value === "(") {
      // current自增，因为AST并不关心括号的存在
      token = tokens[++current];

      // 创建类型为 `CallExpression` 的节点，节点名称设为token的值，因为Lisp的语法中跟在 `(` 后面的就是方法的名称
      let node = {
        type: "CallExpression",
        name: token.value,
        params: [],
      };

      // current自增，跳过name token
      token = tokens[++current];
    
      // 接下来查找下一个 `)` 前函数所有的参数token
      // 因为函数存在嵌套的情况，比如 `(add 2 (substract 4 2))` 所以这里我们使用递归进行遍历
      

    }
  }
}
