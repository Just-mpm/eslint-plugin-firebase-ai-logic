import type { Rule } from 'eslint';

export type RuleModule = Rule.RuleModule;

export interface RuleContext extends Rule.RuleContext {
  report: (descriptor: Rule.ReportDescriptor) => void;
}

export interface RuleMeta extends Rule.RuleMetaData {
  type: 'problem' | 'suggestion' | 'layout';
  docs: {
    description: string;
    recommended: boolean;
    url?: string;
  };
  fixable?: 'code' | 'whitespace';
  hasSuggestions?: boolean;
  schema: readonly unknown[];
  messages: Record<string, string>;
}
