FROM php:8.2-apache

# Extensions PHP nécessaires (PDO MySQL)
RUN docker-php-ext-install pdo pdo_mysql mysqli

# Activer mod_rewrite (utile si l'app en a besoin plus tard)
RUN a2enmod rewrite

# Autoriser .htaccess (déjà présent dans /api)
RUN sed -i 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Copier le code de l'application dans le dossier servi par Apache
COPY . /var/www/html/

# Permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 80
