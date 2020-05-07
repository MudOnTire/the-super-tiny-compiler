今天，我们一起来写一个编译器（compiler），但不仅仅是一个编译器，而是一个超级迷你小巧的编译器。这个编译器是如此小巧，以至于如果把所有的注释都去掉只剩下不到 200 行代码。

我们将使用这个编译器把类 Lisp 的函数调用语法转成类 C 的，如果大家对 Lisp 或者 C 不了解，我快速普及一下：

下面是常见的加、减函数调用在 Lisp 和 C 中的写法：

```
                LISP                      C

  2 + 2          (add 2 2)                 add(2, 2)
  4 - 2          (subtract 4 2)            subtract(4, 2)
  2 + (4 - 2)    (add 2 (subtract 4 2))    add(2, subtract(4, 2))
```

简单吧？这就是我们需要编译的全部内容，虽然不是完整的 Lisp 和 C 的语法，但是也能展示一个现代的编译器需要具备的很多功能。

大部分编译器的工作可以分为三个基本阶段：解析（Parsing）、转换（Transformation）、代码生成（Code Generation ）

1. **解析**：是将原始代码转换成更抽象的“存在”（AST，抽象语法树）

1. **转换**：是对 AST 进行各种变换

1. **代码生成**：是将变换后的 AST 重新转成代码

# 编译过程

## 解析（Parsing）

**解析**通常可以分成两个阶段：词法分析和语法分析

1. **词法分析**：将原始代码通过标记程序（tokenizer）或者词法分析器（lexer）分解为一个个标记（token）标记对象存储在一个数组中，用以描述一段段孤立的语法片段。它们可以是数字、标签、标点符号、运算符等等。

1. **语法分析**：将标记重新格式化为用于描述该段语法、以及它与其他片段关系的表示形式，这种表现形式称为“中间表示”或者“抽象语法树（Abstract Syntax Tree）”

抽象语法树（简称为 AST），是一种深层嵌套的对象以易于使用的方式表示代码并提供关于代码的一切信息。

对于以下的语法：

```
(add 2 (subtract 4 2))
```

词法分析生成的标记大致如下：

```
[
  { type: 'paren',  value: '('        },
  { type: 'name',   value: 'add'      },
  { type: 'number', value: '2'        },
  { type: 'paren',  value: '('        },
  { type: 'name',   value: 'subtract' },
  { type: 'number', value: '4'        },
  { type: 'number', value: '2'        },
  { type: 'paren',  value: ')'        },
  { type: 'paren',  value: ')'        },
]
```

语法分析生成的抽象语法树大致长这样：

```
{
  type: "Program",
  body: [
    {
      type: "CallExpression",
      name: "add",
      params: [
        {
          type: "NumberLiteral",
          value: "2",
        },
        {
          type: "CallExpression",
          name: "subtract",
          params: [
            {
              type: "NumberLiteral",
              value: "4",
            },
            {
              type: "NumberLiteral",
              value: "2",
            },
          ],
        },
      ],
    },
  ],
};
```

## 转换（Transformation）

解析完成后就进入转换阶段了，将上一步生成的AST进行修改，修改的结果可以是和之前相同的语言（比如ES6到ES5），也可以生成一个新的语言（比如本文）。接下来，让我们看看如何对AST进行转换。

AST中带有 `type` 属性的对象称为AST节点（AST Node）。这些节点分别描述了代码中一段独立的部分。

比如描述一个数字的节点：

```
{
  type: 'NumberLiteral',
  value: '2',
}
```

或者描述函数调用表达式的节点：

```
{
  type: 'CallExpression',
  name: 'subtract',
  params: [...nested nodes...],
}
```

对AST转换可以是对其节点进行操作比如增加、删除、替换节点中的属性；也可以是增加、删除节点本身；也可以是现有的AST为基础创建一份新的AST。在本文中由于是Lisp到C这两种语言之间的转换，因此我们选择创建新的AST。

### 遍历

为了访问AST中所有的节点