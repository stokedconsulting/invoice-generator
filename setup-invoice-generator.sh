#!/bin/bash

# Setup ~/.invoice-generator/ directory

INVOICE_DIR="$HOME/.invoice-generator"
CONFIG_FILE="$INVOICE_DIR/config.json"
INVOICES_DIR="$INVOICE_DIR/.invoices"

echo "Setting up Invoice Generator..."
echo ""

# Create directory if it doesn't exist
if [ ! -d "$INVOICE_DIR" ]; then
    echo "Creating $INVOICE_DIR"
    mkdir -p "$INVOICE_DIR"
else
    echo "$INVOICE_DIR already exists"
fi

# Create .invoices subdirectory
if [ ! -d "$INVOICES_DIR" ]; then
    echo "Creating $INVOICES_DIR"
    mkdir -p "$INVOICES_DIR"
else
    echo "$INVOICES_DIR already exists"
fi

# Copy config file if it doesn't exist
if [ ! -f "$CONFIG_FILE" ]; then
    if [ -f "invoice-configs.json" ]; then
        echo "Copying template config to $CONFIG_FILE"
        cp invoice-configs.json "$CONFIG_FILE"
        echo ""
        echo "Edit $CONFIG_FILE to add your customer details."
    else
        echo "No local invoice-configs.json found to copy"
        echo "You'll need to create $CONFIG_FILE manually"
    fi
else
    echo "$CONFIG_FILE already exists"
fi

echo ""
echo "Setup complete!"
echo ""
echo "Config location: $CONFIG_FILE"
echo "Invoices stored in: $INVOICES_DIR"
echo ""
echo "All invoice-gen commands will use this config,"
echo "whether running globally, in dev, or via scheduler."
