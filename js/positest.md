# ���l
## ���W�n�ɂ���
### �J�������W�n
�J�������W�n�̊e�������͉摜�̉E�A��A��O�����̏��ł���B

### �}�[�J�[���W�n
�}�[�J�[���W�n�̌��_�̓}�[�J�[�̒��S�B
�e���̕����͉E�A��A��O�����̏��ł���B

## �œ_�����ɂ���
�摜�̓��e�ʂ̉��̒�����1.0�ł���Ƃ����Ƃ��̏œ_�����ł���B
�܂�œ_������1.0�ł���Ƃ��́A�摜�̉����Ɠ��������������ꂽ�ʒu�Ɏˉe���e�̎��_������B


## positionEstimater.observeMarkers(domElement)
### �T�v
domElement����ǂݍ��񂾉摜����}�[�J�[�����o���A���̃}�[�J�[�̉摜���̈ʒu�Ȃǂ���J�����̎p���Ɋւ�������擾����B

### ����
domElement -- �摜�A����A�E�F�u�J������domElement

### �߂�l
result_array -- {markerData}
��markerData �ȉ��̂悤�ȃL�[�����I�u�W�F�N�g
* D1 -- �}�[�J�[���J�����i�J�������W�n,�œ_����1.0�̏ꍇ�̂��́j
* R1 -- �J�������W�n�̊��(�e��,�}�[�J�[���W�n�ɂ��������)
* GR1 -- �J�������W�n�̊��(�e��,��΍��W�n�ɂ��������)
* E1 -- D1,R1�ɑ΂���G���[(������0~12������̒l�����悤�ł��邪�A�ڍׂ͕s��)
* Xm -- �}�[�J�[���S�ʒu(��΍��W�n)
* Rm -- �}�[�J�[���W�n�̊��(�e��,��΍��W�n�ɂ��������)
* id -- �}�[�J�[��id

## positionEstimater.averageRotationMatrix(R)
### �T�v
�e�}�[�J�[�ɂ��J�����̐���p���𕽋ς���
���ς����������@�Ƃ��Ă�[�Q�l�����N](http://home.hiroshima-u.ac.jp/tamaki/study/20090924SIS200923.pdf)���Q�l�Ƃ��ē��ْl������p�����@���̗p�����B

### ����
markers -- �J�����̎p���s�����array

###�߂�l
���ώp���s��

## positionEstimater.estimate_with_f(R_, Xm, D, n_marker, f)
### �T�v
�œ_�������^�����Ă���΃}�[�J�[���Ƃ̊ϑ��ɂ��J�����̐���ʒu�͈�ӂɒ�܂�B
���̊֐��ł͒P�ɑS�}�[�J�[�̈ʒu�̕��ςɂ���Ĉʒu�𐄒肷��B

### ����
R_ -- �J�������W�n�̊e���(�e��,��΍��W�n�ɂ��������,�S�}�[�J�[�̕��ϒl)
Xm -- �}�[�J�[�ʒu��array(��΍��W�n�ɂ��������)
D -- �}�[�J�[���J������array(��΍��W�n�ɂ��������)
n_marker -- �}�[�J�[�̌�
f -- �œ_����

### �߂�l
�ȉ��̂悤�ȃL�[�����I�u�W�F�N�g
* x -- �J�����̐���ʒu
* R -- �J�������W�n�̊e���(������R_�Ɠ�������)

## positionEstimater.estimate_without_f(R_, Xm, D, n_marker)
## �T�v
�œ_������1.0�ł���Ƃ����Ƃ��̃J�����ʒu�Ɋւ�����̓J�����̉��s�������Ɋւ��鎩�R�x�������Ă���B
���ꂼ��̃}�[�J�[����̃J��������ʒu�̂΂�����ŏ��ƂȂ�悤�Ȏ��̏œ_�����ƃJ�����ʒu��Ԃ�

## ����
R_ -- �J�������W�n�̊e���(�e��,��΍��W�n�ɂ��������,�S�}�[�J�[�̕��ϒl)
Xm -- �}�[�J�[�ʒu��array(��΍��W�n�ɂ��������)
D -- �}�[�J�[���J������array(��΍��W�n�ɂ��������)
n_marker -- �}�[�J�[�̌�

## �߂�l
�ȉ��̃L�[�����I�u�W�F�N�g
* x -- �J��������ʒu(��΍��W�n)
* R -- �J�������W�n�̊e���(����R_�Ɠ�������)
* f -- ����œ_����