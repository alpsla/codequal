FROM php:8.2-cli

# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    unzip \
    libzip-dev \
    && docker-php-ext-install zip \
    && rm -rf /var/lib/apt/lists/*

# Install Composer
RUN php -r "copy('https://getcomposer.org/installer', 'composer-setup.php');" \
    && php composer-setup.php --install-dir=/usr/local/bin --filename=composer \
    && php -r "unlink('composer-setup.php');"

# Create a temporary directory for global packages
WORKDIR /tmp/php-tools

# Install PHP analysis tools globally
RUN composer require --dev \
    phpstan/phpstan:^1.10 \
    phpmd/phpmd:^2.14 \
    squizlabs/php_codesniffer:^3.7 \
    vimeo/psalm:^5.15 \
    phan/phan:^5.4 \
    && mv vendor /opt/php-tools \
    && rm -rf /tmp/php-tools

# Create symlinks for the tools
RUN ln -s /opt/php-tools/bin/phpstan /usr/local/bin/phpstan \
    && ln -s /opt/php-tools/bin/phpmd /usr/local/bin/phpmd \
    && ln -s /opt/php-tools/bin/phpcs /usr/local/bin/phpcs \
    && ln -s /opt/php-tools/bin/phpcbf /usr/local/bin/phpcbf \
    && ln -s /opt/php-tools/bin/psalm /usr/local/bin/psalm \
    && ln -s /opt/php-tools/bin/phan /usr/local/bin/phan

# Create default PHPStan configuration
RUN echo 'parameters:\n\
  level: 5\n\
  paths:\n\
    - .\n\
  excludePaths:\n\
    - vendor\n\
    - tests\n\
  treatPhpDocTypesAsCertain: false\n\
  reportUnmatchedIgnoredErrors: false\n\
  checkMissingIterableValueType: false' > /etc/phpstan.neon

# Create default PHPMD ruleset
RUN echo '<?xml version="1.0"?>\n\
<ruleset name="Default PHP Mess Detector Ruleset"\n\
         xmlns="http://pmd.sf.net/ruleset/1.0.0"\n\
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n\
         xsi:schemaLocation="http://pmd.sf.net/ruleset/1.0.0 http://pmd.sf.net/ruleset_xml_schema.xsd"\n\
         xsi:noNamespaceSchemaLocation="http://pmd.sf.net/ruleset_xml_schema.xsd">\n\
  <description>Default ruleset for PHP Mess Detector</description>\n\
  <rule ref="rulesets/codesize.xml" />\n\
  <rule ref="rulesets/controversial.xml" />\n\
  <rule ref="rulesets/design.xml" />\n\
  <rule ref="rulesets/naming.xml" />\n\
  <rule ref="rulesets/unusedcode.xml" />\n\
</ruleset>' > /etc/phpmd.xml

WORKDIR /workspace

CMD ["/bin/bash"]