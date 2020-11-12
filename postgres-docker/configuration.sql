\set user_pass '\'' `echo "$POSTGRES_PASSWORD"` '\'';
ALTER USER mythic_user PASSWORD :user_pass;