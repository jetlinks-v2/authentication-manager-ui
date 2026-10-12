import type { CSSProperties } from 'vue';
import type { TooltipProps } from 'ant-design-vue';
import type { PopconfirmProps } from 'ant-design-vue/es/popconfirm';
export type AccessLogItem = {
  id: string;
  context: Record<string, unknown>;
  describe: string;
  exception: string;
  httpHeaders: Record<string, unknown>;
  httpMethod: string;
  responseStatus: number;
  ip: string;
  method: string;
  parameters: unknown;
  requestTime: number;
  responseTime: number;
  target: string;
  url: string;
  action: string;
  timestamp?: number;
  traceId?: string;
  spanId?: string;
  creatorId?: string;
  ipRegion?: string;
};

export type SystemLogItem = {
  id: string;
  className: string;
  context: Record<string, unknown>;
  createTime: number;
  exceptionStack: string;
  level: string;
  lineNumber: number;
  message: string;
  methodName: string;
  name: string;
  threadId: string;
  threadName: string;
  timestamp?: number;
  traceId?: string;
  spanId?: string;
};

export interface ActionsType {
  key: string;
  text?: string;
  disabled?: boolean;
  permission?: boolean;
  onClick?: (data: any) => void;
  style?: CSSProperties;
  tooltip?: TooltipProps;
  popConfirm?: PopconfirmProps;
  icon?: string;
  children?: ActionsType[];
}
