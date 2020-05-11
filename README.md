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

# 编译过程简介

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

### 遍历AST

首先，我们需要遍历AST中所有的节点，这里我们使用 访问者模式（Visitor Pattern）(https://segmentfault.com/a/1190000022396503#item-5-9) 来实现对节点对象的访问。

**创建一个访问者对象：**

> 这里的实现并不完全遵循访问者模式的定义，只是借鉴了其思想，通过一个访问者对象来统一承载节点访问的逻辑

```
var visitor = {
  NumberLiteral(node, parent) {},
  CallExpression(node, parent) {},
}
```

当我们遍历AST时，将会调用 visitor 中与每个节点类型对应的方法，并传入被访问的节点和其上级对象。同时，未避免遍历到某些分支上进入“死胡同”，对节点的访问分成了两步：进入（enter）和离开（exit）。Visitor升级为以下结构：

```
var visitor = {
  NumberLiteral: {
    enter(node, parent) {},
    exit(node, parent) {},
  },
  CallExpression: {
    enter(node, parent) {},
    exit(node, parent) {},
  }
};
```

遍历AST的路径可以描述如下：

```
-> Program (enter)
  -> CallExpression (enter)
    -> Number Literal (enter)
    <- Number Literal (exit)
    -> Call Expression (enter)
       -> Number Literal (enter)
       <- Number Literal (exit)
       -> Number Literal (enter)
       <- Number Literal (exit)
    <- CallExpression (exit)
  <- CallExpression (exit)
<- Program (exit)
```

## 代码生成（Code Generation）

代码生成是Compile的最后阶段，有时候这一阶段会做一些和转换（Transformation）重叠的工作，但是大部分时候代码生成只是将AST转成字符串代码。代码生成有几种不同的工作方式，有些编译器会使用之前生成的标记（token），另一些会为代码创建单独的表现形式以便可以线性的打印节点，但绝大部分会使用我们刚刚创建的AST，这也是我们接下来继续探讨的内容。

代码生成器知道如何不同类型的AST节点“打印”（print）出来，而且递归地进行直到所有的节点都打印并生成完整的代码。

以上就是编译器所要做的工作，但并不代表所有的编译器都是按这个来的。不同的编译器有不同的使用场景，有些可能需要更多的步骤。但是现在我们应该对整个编译过程有了一个全面的认识，下面我们就来实现一个编译器。

# 编译器实现

## 标记程序（Tokenizer）

我们从编译的第一阶段：**解析** 开始，使用标记程序进行词法分析。我们需要先把代码分解成一个标记的数组：

```
(add 2 (subtract 4 2))   =>   [{ type: 'paren', value: '(' }, ...]
```

标记程序实现如下：

```
/**
 * 标记程序：接收代码文本，输出标记的数组
 * @param {string} input 代码文本
 */
function tokenizer(input){
  // 像光标一样标记在代码中的位置
  let current = 0;

  // 用于存放标记的数组
  let tokens = [];

  // 使用while循环遍历代码
  while(current < input.length) {
    // 获取“当前”位置上的字符
    let char = input[current];

    // 首先检测 "(" ，稍后在 `CallExpression` 会用到
    if (char === '(') {

    }
  }
}
```