export type TransformerCapacity = '8MVA' | '12.3MVA' | '16.5MVA';
export type TransformerType = 'Auto' | 'Traction' | 'V Connect';

export type TestStage = 'Not Started' | 'Tested' | 'Reviewed' | 'Authorized';
export type JobStatus = 'Processing' | 'Completed';
export type UserRole = 'Viewer' | 'Admin_Tested' | 'Admin_Reviewed' | 'Admin_Authorized';

export interface TransformerTest {
  id: string;
  name: string;
  stage: TestStage;
  updatedAt: number;
  observationData?: Record<string, string>;
  accepted?: boolean;
}

export interface Job {
  id: string;
  name: string;
  capacity: TransformerCapacity;
  type: TransformerType;
  createdAt: number;
  status: JobStatus;
  tests: TransformerTest[];
  ratingData?: Record<string, string>;
}

export type AppView = 
  | 'LOGIN' 
  | 'DASHBOARD' 
  | 'SELECT_CAPACITY' 
  | 'SELECT_TYPE' 
  | 'NAME_JOB' 
  | 'JOB_LIST'
  | 'JOB_DETAIL'
  | 'TEST_REPORT';
