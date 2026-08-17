# =========================================================================
#  Dockerfile: PHP 8.3-FPM Production Image for Wayne IoT Server Gen 2
#  包含 PostgreSQL 擴展、Redis (phpredis)、OPcache (JIT)、Supervisor
# =========================================================================

FROM php:8.3-fpm-alpine

# Install System Dependencies
RUN apk update && apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    zip \
    unzip \
    curl \
    git \
    supervisor \
    linux-headers \
    $PHPIZE_DEPS

# Install Core PHP Extensions
RUN docker-php-ext-install pdo pdo_pgsql pgsql zip opcache bcmath pcntl

# Install phpredis extension via PECL
RUN pecl install redis && docker-php-ext-enable redis

# Configure Production OPcache with JIT
RUN { \
    echo 'opcache.enable=1'; \
    echo 'opcache.memory_consumption=256'; \
    echo 'opcache.interned_strings_buffer=16'; \
    echo 'opcache.max_accelerated_files=20000'; \
    echo 'opcache.revalidate_freq=0'; \
    echo 'opcache.validate_timestamps=0'; \
    echo 'opcache.jit=tracing'; \
    echo 'opcache.jit_buffer_size=128M'; \
} > /usr/local/etc/php/conf.d/opcache-recommended.ini

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Working Directory
WORKDIR /var/www/html

# Permissions
RUN chown -R www-data:www-data /var/www/html

EXPOSE 9000

CMD ["php-fpm"]
