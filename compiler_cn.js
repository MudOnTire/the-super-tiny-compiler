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
      tokens.push({type:'number',value});

      // 跳出当次循环
      continue;
    }

    // 同样的，我们增加对字符串的检测，判定双引号之间的内容为字符串
    //   (concat "foo" "bar")
    //            ^^^   ^^^ string tokens
  }
}
