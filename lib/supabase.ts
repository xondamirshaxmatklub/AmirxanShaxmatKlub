
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qocyxmbxbpfqankuyzjz.supabase.co';
const supabaseKey = 'sb_publishable_mYdqwtt8LjkRMecrjYLwCQ_lVzdbajh';

export const supabase = createClient(supabaseUrl, supabaseKey);
