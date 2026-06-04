// Simple manual test for conversionOrchestrator
// Run with: npx tsx src/orchestrator/test/conversionOrchestrator.test.ts

import { buildExecutionPlan } from '../conversionOrchestrator';
import type { FileItem, OutputSettings, ModifySettings, AppSettings, ToolchainSelection } from '$lib/domain';

const testItem: FileItem = {
  absPath: '/test/image.jpg',
  name: 'image',
  ext: 'jpg',
  dir: '/test',
  size: 1024000,
};

const testOutput: OutputSettings = {
  format: 'JPEG XL',
  quality: 80,
  lossless: false,
  max_compression: false,
  effort: 7,
  intelligent_effort: false,
  jxl_modular: false,
  jxl_verify: false,
  jxl_normalize_enable: false,
  jxl_normalize_when: 'On Fail',
  aom_av1_chroma_subsampling: 'Default',
  jpegli_chroma_subsampling: 'Default',
  jpg_chroma_subsampling: 'Default',
  if_file_exists: 'Replace',
  custom_output_dir: false,
  custom_output_dir_path: '',
  keep_dir_struct: false,
  delete_original: false,
  delete_original_mode: 'To Trash',
  smallest_format_pool: { png: true, webp: true, jxl: true },
  jxl_png_fallback: true,
  threads: 4,
};

const testModify: ModifySettings = {
  downscaling: {
    enabled: false,
    mode: 'Resolution',
    percent: 50,
    width: 1920,
    height: 1080,
    file_size: 500,
    shortest_side: 1080,
    longest_side: 1920,
    megapixels: 2.1,
    resample: 'Default',
  },
  misc: {
    keep_metadata: 'Encoder - Wipe',
    keep_timestamps: false,
  },
};

const testApp: AppSettings = {
  theme: 'Miku',
  lane_max_width: 44,
  custom_resampling: false,
  sorting_disabled: false,
  excluded_formats: ['avif', 'jxl', 'webp', 'gif'],
  disable_downscaling_startup: false,
  disable_delete_startup: true,
  enable_jxl_effort_10: false,
  disable_progressive_jpegli: false,
  enable_custom_args: false,
  cjxl_args: '',
  avifenc_args: '',
  cjpegli_args: '',
  im_args: '',
  enable_quality_precision_snapping: true,
  jpg_encoder: 'JPEGLI',
  jxl_auto_lossless_jpeg: true,
  ram_optimizer: 'Disabled',
  ram_optimizer_rules: '',
  jxl_lossy_modular: false,
  jxl_int_effort: false,
  play_sound_on_finish: true,
  play_sound_on_finish_vol: 0.5,
  keep_if_larger: false,
  copy_if_larger: false,
  exiftool_args: {
    'ExifTool - Wipe': '-overwrite_original -all= --ICC_Profile:all "$dst"',
    'ExifTool - Preserve': '-overwrite_original -TagsFromFile "$src" -all:all "$dst"',
    'ExifTool - Unsafe Wipe': '-overwrite_original -all= "$dst"',
    'ExifTool - Custom': '',
  },
  avif_encoder: 'AOM AV1',
  avif_bit_depth: 'Auto',
  avif_aom_iq_tune: false,
  processing_order: 'Original',
};

const testToolchain: ToolchainSelection = {
  cjxlPath: 'cjxl',
  djxlPath: 'djxl',
  avifencPath: 'avifenc',
  avifdecPath: 'avifdec',
  cjpegliPath: 'cjpegli',
  imagemagickPath: 'magick',
  exiftoolPath: 'exiftool',
  oxipngPath: 'oxipng',
};

function runTest() {
  console.log('=== Testing buildExecutionPlan ===\n');

  const { plan, validation } = buildExecutionPlan(
    [testItem],
    testOutput,
    testModify,
    testApp,
    testToolchain
  );

  if (!validation.valid) {
    console.error('Validation failed:', validation.errorTitle, validation.errorDescription);
    process.exit(1);
  }

  console.log('Run ID:', plan.runId);
  console.log('Items:', plan.items.length);
  console.log('Tasks:', plan.tasks.length);
  console.log('Policies:', JSON.stringify(plan.policies, null, 2));
  console.log('\nTasks:');

  for (const task of plan.tasks) {
    console.log(`  [${task.stepType}] ${task.command} ${task.args.join(' ')}`);
  }

  // Verify task structure
  const encodeTask = plan.tasks.find(t => t.stepType === 'encode');
  if (!encodeTask) {
    console.error('No encode task found!');
    process.exit(1);
  }

  if (!encodeTask || encodeTask.command !== 'cjxl') {
    console.error('Expected cjxl command, got:', encodeTask.command);
    process.exit(1);
  }

  if (!encodeTask || !encodeTask.args.includes('-q') || !encodeTask.args.includes('80')) {
    console.error('Expected quality 80 in args:', encodeTask.args);
    process.exit(1);
  }

  console.log('\n=== All tests passed! ===');
}

runTest();
