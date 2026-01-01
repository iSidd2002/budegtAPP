/**
 * Tests for mathematical expression evaluator
 * Testing the evaluateExpression function logic
 */

// Replicate the evaluateExpression function for testing
function evaluateExpression(expr: string): { value: number | null; isExpression: boolean; error: string | null } {
  if (!expr || expr.trim() === '') {
    return { value: null, isExpression: false, error: null };
  }

  const cleanExpr = expr.replace(/\s/g, '');

  const simpleNumber = parseFloat(cleanExpr);
  if (!isNaN(simpleNumber) && /^-?\d*\.?\d+$/.test(cleanExpr)) {
    return { value: simpleNumber, isExpression: false, error: null };
  }

  if (!/^[\d+\-*/().]+$/.test(cleanExpr)) {
    return { value: null, isExpression: true, error: 'Invalid characters' };
  }

  if (/\(\)/.test(cleanExpr) || /[+\-*/]{2,}/.test(cleanExpr)) {
    return { value: null, isExpression: true, error: 'Invalid expression' };
  }

  try {
    const tokens = cleanExpr.match(/(\d+\.?\d*|[+\-*/()])/g);
    if (!tokens) {
      return { value: null, isExpression: true, error: 'Invalid expression' };
    }

    const outputQueue: (number | string)[] = [];
    const operatorStack: string[] = [];
    const precedence: Record<string, number> = { '+': 1, '-': 1, '*': 2, '/': 2 };

    for (const token of tokens) {
      if (/^\d+\.?\d*$/.test(token)) {
        outputQueue.push(parseFloat(token));
      } else if (token === '(') {
        operatorStack.push(token);
      } else if (token === ')') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(operatorStack.pop()!);
        }
        if (operatorStack.length === 0) {
          return { value: null, isExpression: true, error: 'Mismatched parentheses' };
        }
        operatorStack.pop();
      } else if (['+', '-', '*', '/'].includes(token)) {
        while (
          operatorStack.length > 0 &&
          operatorStack[operatorStack.length - 1] !== '(' &&
          precedence[operatorStack[operatorStack.length - 1]] >= precedence[token]
        ) {
          outputQueue.push(operatorStack.pop()!);
        }
        operatorStack.push(token);
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop()!;
      if (op === '(' || op === ')') {
        return { value: null, isExpression: true, error: 'Mismatched parentheses' };
      }
      outputQueue.push(op);
    }

    const evalStack: number[] = [];
    for (const token of outputQueue) {
      if (typeof token === 'number') {
        evalStack.push(token);
      } else {
        if (evalStack.length < 2) {
          return { value: null, isExpression: true, error: 'Invalid expression' };
        }
        const b = evalStack.pop()!;
        const a = evalStack.pop()!;
        switch (token) {
          case '+': evalStack.push(a + b); break;
          case '-': evalStack.push(a - b); break;
          case '*': evalStack.push(a * b); break;
          case '/':
            if (b === 0) {
              return { value: null, isExpression: true, error: 'Division by zero' };
            }
            evalStack.push(a / b);
            break;
        }
      }
    }

    if (evalStack.length !== 1) {
      return { value: null, isExpression: true, error: 'Invalid expression' };
    }

    const result = evalStack[0];
    if (!isFinite(result)) {
      return { value: null, isExpression: true, error: 'Result is too large' };
    }

    return { value: Math.round(result * 100) / 100, isExpression: true, error: null };
  } catch {
    return { value: null, isExpression: true, error: 'Invalid expression' };
  }
}

describe('evaluateExpression', () => {
  describe('simple numbers', () => {
    it('should parse simple integers', () => {
      expect(evaluateExpression('100')).toEqual({ value: 100, isExpression: false, error: null });
      expect(evaluateExpression('0')).toEqual({ value: 0, isExpression: false, error: null });
    });

    it('should parse decimal numbers', () => {
      expect(evaluateExpression('100.50')).toEqual({ value: 100.5, isExpression: false, error: null });
      expect(evaluateExpression('.5')).toEqual({ value: 0.5, isExpression: false, error: null });
    });

    it('should handle negative numbers', () => {
      expect(evaluateExpression('-100')).toEqual({ value: -100, isExpression: false, error: null });
    });

    it('should handle empty input', () => {
      expect(evaluateExpression('')).toEqual({ value: null, isExpression: false, error: null });
      expect(evaluateExpression('   ')).toEqual({ value: null, isExpression: false, error: null });
    });
  });

  describe('basic operations', () => {
    it('should add two numbers', () => {
      expect(evaluateExpression('100+50')).toEqual({ value: 150, isExpression: true, error: null });
    });

    it('should subtract two numbers', () => {
      expect(evaluateExpression('100-30')).toEqual({ value: 70, isExpression: true, error: null });
    });

    it('should multiply two numbers', () => {
      expect(evaluateExpression('10*5')).toEqual({ value: 50, isExpression: true, error: null });
    });

    it('should divide two numbers', () => {
      expect(evaluateExpression('100/4')).toEqual({ value: 25, isExpression: true, error: null });
    });

    it('should handle whitespace', () => {
      expect(evaluateExpression('100 + 50')).toEqual({ value: 150, isExpression: true, error: null });
      expect(evaluateExpression(' 100  +  50 ')).toEqual({ value: 150, isExpression: true, error: null });
    });
  });

  describe('operator precedence', () => {
    it('should respect multiplication over addition', () => {
      expect(evaluateExpression('10+5*2')).toEqual({ value: 20, isExpression: true, error: null });
    });

    it('should respect division over subtraction', () => {
      expect(evaluateExpression('20-10/2')).toEqual({ value: 15, isExpression: true, error: null });
    });

    it('should handle complex expressions', () => {
      expect(evaluateExpression('10+5*2-3')).toEqual({ value: 17, isExpression: true, error: null });
    });
  });

  describe('parentheses', () => {
    it('should handle simple parentheses', () => {
      expect(evaluateExpression('(10+5)*2')).toEqual({ value: 30, isExpression: true, error: null });
    });

    it('should handle nested parentheses', () => {
      expect(evaluateExpression('((10+5)*2)+10')).toEqual({ value: 40, isExpression: true, error: null });
    });

    it('should reject mismatched opening parentheses', () => {
      const result = evaluateExpression('(10+5');
      expect(result.error).toBe('Mismatched parentheses');
    });

    it('should reject mismatched closing parentheses', () => {
      const result = evaluateExpression('10+5)');
      expect(result.error).toBe('Mismatched parentheses');
    });

    it('should reject empty parentheses', () => {
      const result = evaluateExpression('10+()');
      expect(result.error).toBe('Invalid expression');
    });
  });

  describe('error handling', () => {
    it('should reject invalid characters', () => {
      expect(evaluateExpression('100+abc')).toEqual({ value: null, isExpression: true, error: 'Invalid characters' });
      expect(evaluateExpression('100$50')).toEqual({ value: null, isExpression: true, error: 'Invalid characters' });
    });

    it('should reject consecutive operators', () => {
      expect(evaluateExpression('100++50')).toEqual({ value: null, isExpression: true, error: 'Invalid expression' });
      expect(evaluateExpression('100*/50')).toEqual({ value: null, isExpression: true, error: 'Invalid expression' });
    });

    it('should handle division by zero', () => {
      expect(evaluateExpression('100/0')).toEqual({ value: null, isExpression: true, error: 'Division by zero' });
    });

    it('should handle trailing operator', () => {
      const result = evaluateExpression('100+');
      expect(result.error).toBe('Invalid expression');
    });

    it('should handle leading operator (except minus)', () => {
      const result = evaluateExpression('+100');
      expect(result.error).toBe('Invalid expression');
    });
  });

  describe('decimal precision', () => {
    it('should round to 2 decimal places', () => {
      expect(evaluateExpression('10/3')).toEqual({ value: 3.33, isExpression: true, error: null });
      expect(evaluateExpression('100/6')).toEqual({ value: 16.67, isExpression: true, error: null });
    });

    it('should handle decimal inputs', () => {
      expect(evaluateExpression('10.5+5.5')).toEqual({ value: 16, isExpression: true, error: null });
      expect(evaluateExpression('100.25*2')).toEqual({ value: 200.5, isExpression: true, error: null });
    });
  });

  describe('real-world expense calculations', () => {
    it('should calculate split bill', () => {
      // Dinner bill split 3 ways: 1500/3 = 500
      expect(evaluateExpression('1500/3')).toEqual({ value: 500, isExpression: true, error: null });
    });

    it('should calculate tip included', () => {
      // Bill + 10% tip: 1000 + 100 = 1100
      expect(evaluateExpression('1000+100')).toEqual({ value: 1100, isExpression: true, error: null });
    });

    it('should calculate multiple items', () => {
      // 3 coffees at 150 each + 2 pastries at 80 each
      expect(evaluateExpression('3*150+2*80')).toEqual({ value: 610, isExpression: true, error: null });
    });

    it('should calculate discounted price', () => {
      // Original 1000, 20% off = 1000 - 200 = 800
      expect(evaluateExpression('1000-200')).toEqual({ value: 800, isExpression: true, error: null });
    });
  });
});

