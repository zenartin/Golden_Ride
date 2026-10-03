"""add family tables

Revision ID: 3047b720a926
Revises: 2047b720a925
Create Date: 2026-10-04 00:26:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '3047b720a926'
down_revision = '2047b720a925'
branch_labels = None
depends_on = None


def upgrade():
    # create family_groups table
    op.create_table(
        'family_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('organizer_user_id', sa.Integer(), nullable=False),
        sa.Column('family_name', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['organizer_user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_family_groups_id'), 'family_groups', ['id'], unique=False)
    op.create_index(op.f('ix_family_groups_organizer_user_id'), 'family_groups', ['organizer_user_id'], unique=False)

    # create family_members table
    op.create_table(
        'family_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('family_group_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('role', sa.String(), nullable=True),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('joined_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['family_group_id'], ['family_groups.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_family_members_id'), 'family_members', ['id'], unique=False)
    op.create_index(op.f('ix_family_members_family_group_id'), 'family_members', ['family_group_id'], unique=False)
    op.create_index(op.f('ix_family_members_user_id'), 'family_members', ['user_id'], unique=False)

    # create family_invitations table
    op.create_table(
        'family_invitations',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('family_group_id', sa.Integer(), nullable=False),
        sa.Column('invitee_contact', sa.String(), nullable=False),
        sa.Column('invitation_token_hash', sa.String(), nullable=False),
        sa.Column('status', sa.String(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['family_group_id'], ['family_groups.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_family_invitations_id'), 'family_invitations', ['id'], unique=False)
    op.create_index(op.f('ix_family_invitations_family_group_id'), 'family_invitations', ['family_group_id'], unique=False)
    op.create_index(op.f('ix_family_invitations_invitation_token_hash'), 'family_invitations', ['invitation_token_hash'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_family_invitations_invitation_token_hash'), table_name='family_invitations')
    op.drop_index(op.f('ix_family_invitations_family_group_id'), table_name='family_invitations')
    op.drop_index(op.f('ix_family_invitations_id'), table_name='family_invitations')
    op.drop_table('family_invitations')
    
    op.drop_index(op.f('ix_family_members_user_id'), table_name='family_members')
    op.drop_index(op.f('ix_family_members_family_group_id'), table_name='family_members')
    op.drop_index(op.f('ix_family_members_id'), table_name='family_members')
    op.drop_table('family_members')
    
    op.drop_index(op.f('ix_family_groups_organizer_user_id'), table_name='family_groups')
    op.drop_index(op.f('ix_family_groups_id'), table_name='family_groups')
    op.drop_table('family_groups')
